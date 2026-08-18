import { NextResponse } from 'next/server';
import { generateDailyIdeas } from '@/lib/ideation';
import { getAuthContext } from '@/lib/auth';

export const maxDuration = 60; // 60 seconds timeout limit for idea generation


export async function GET(req: Request) {
  let user: any = null;
  try {
    const authCtx = await getAuthContext();
    user = authCtx.user;
    const authorizedSupabase = authCtx.supabase;

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = user.id;
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';
    const locale = searchParams.get('locale') || 'en';
    const requestedStatus = searchParams.get('status') || 'new';
    const categoryParam = searchParams.get('category');

    // 1. Build basic query
    let query = authorizedSupabase
      .from('ideation_feed')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Handle Archive filtering
    if (requestedStatus === 'archived') {
      query = query.eq('metadata->archived', true);
    } else {
      query = query.eq('status', requestedStatus)
                   .or('metadata->archived.is.null,metadata->archived.eq.false');
    }

    if (categoryParam) {
      query = query.eq('category', categoryParam);
    }

    const { data: existingIdeas, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    const categories = [
      "Awareness", "Problem", "Solution", "Loyalty", "Fast Sales",
      "Myths", "Comparison", "Educational", "Case Study", "Trends", "Lifestyle", "Future"
    ];

    // 2. If we asked for 'new' ideas and didn't find enough, OR we are forcing regeneration
    if (requestedStatus === 'new') {
      if (force) {
        // Clear existing 'new' ideas for this user/category to make room for fresh ones
        let deleteQuery = authorizedSupabase
          .from('ideation_feed')
          .delete()
          .eq('user_id', userId)
          .eq('status', 'new')
          .or('metadata->archived.is.null,metadata->archived.eq.false');
        
        if (categoryParam) {
          deleteQuery = deleteQuery.eq('category', categoryParam);
        }
        
        await deleteQuery;
      }

      // Check total count before generating
      const { count: totalIdeas } = await authorizedSupabase
        .from('ideation_feed')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (!force && totalIdeas && totalIdeas >= 200) {
        return NextResponse.json(existingIdeas || []);
      }

      if (force || !existingIdeas || existingIdeas.length === 0) {
        const categoriesToGenerate = categoryParam 
          ? [categoryParam] 
          : ["Hooks", "Problem", "Solution", "Trends"];
        
        // Execute AI generations in parallel to prevent 60s HTTP timeouts
        const results = await Promise.allSettled(
          categoriesToGenerate.map(cat => generateDailyIdeas(authorizedSupabase as any, userId, locale, cat))
        );
        
        const allFreshIdeas: any[] = [];
        let lastErrorMsg = '';

        for (const res of results) {
          if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            allFreshIdeas.push(...res.value);
          } else if (res.status === 'rejected') {
            console.error('[Ideas API] Batch category generation error:', res.reason);
            lastErrorMsg = res.reason?.message || 'Error generating idea category';
          }
        }
        
        // Deduplicate generated ideas by topic_title
        const uniqueIdeasMap = new Map<string, any>();
        for (const idea of allFreshIdeas) {
          if (idea && idea.topic_title && !uniqueIdeasMap.has(idea.topic_title)) {
            uniqueIdeasMap.set(idea.topic_title, idea);
          }
        }
        const deduplicatedIdeas = Array.from(uniqueIdeasMap.values());
        
        // 🔥 PERSIST TO DATABASE
        if (deduplicatedIdeas.length > 0) {
          const { saveIdeasToFeed } = await import('@/lib/ideation');
          await saveIdeasToFeed(authorizedSupabase as any, userId, deduplicatedIdeas);
        }

        return NextResponse.json(deduplicatedIdeas);
      }
    }

    return NextResponse.json(existingIdeas || []);
  } catch (error: any) {
    if (error?.message === 'Unauthorized' || error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[Ideas API Error] Critical failure:', {
      message: error?.message,
      stack: error?.stack,
      userId: user?.id,
      url: req.url
    });
    try {
      const { searchParams } = new URL(req.url);
      const { notifyAdminError } = await import('@/lib/telegram');
      notifyAdminError({
        source: 'Ideas Generation API',
        error,
        userId: user?.id,
        userEmail: user?.email,
        url: req.url,
        extra: {
          location: 'api/ideas/route.ts:GET',
          status: searchParams.get('status') || 'new',
          category: searchParams.get('category') || 'all',
          locale: searchParams.get('locale') || 'en',
          force: searchParams.get('force') === 'true',
          stack: error?.stack
        }
      }).catch(() => {});
    } catch (e) {}
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { supabase: authorizedSupabase } = await getAuthContext();
    const { ideaId, status, metadata } = await req.json();

    const updateData: any = { status };
    if (metadata) {
      updateData.metadata = metadata;
    }

    if (status === 'archived') {
       updateData.metadata = { ...metadata, archived: true };
    }

    const { data, error } = await authorizedSupabase
      .from('ideation_feed')
      .update(updateData)
      .eq('id', ideaId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
