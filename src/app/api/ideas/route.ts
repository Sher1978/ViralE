import { NextResponse } from 'next/server';
import { generateDailyIdeas } from '@/lib/ideation';
import { getAuthContext } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();

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
        const categoriesToGenerate = categoryParam ? [categoryParam] : categories;
        
        const allFreshIdeas = [];
        for (const cat of categoriesToGenerate) {
           const fresh = await generateDailyIdeas(authorizedSupabase, userId, locale, cat);
           allFreshIdeas.push(...fresh);
        }
        
        // 🔥 PERSIST TO DATABASE
        if (allFreshIdeas.length > 0) {
          const { saveIdeasToFeed } = await import('@/lib/ideation');
          await saveIdeasToFeed(authorizedSupabase, userId, allFreshIdeas);
        }

        return NextResponse.json(allFreshIdeas);
      }
    }

    return NextResponse.json(existingIdeas || []);
  } catch (error: any) {
    console.error('Ideal API Error:', error);
    return new NextResponse(error.message || 'Internal Error', { status: 500 });
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
