import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { generateDailyIdeas } from '@/lib/ai/ideation';

export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const authorizedSupabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await authorizedSupabase.auth.getUser();

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

      const { data: profile } = await authorizedSupabase
        .from('profiles')
        .select('dna_answers')
        .eq('id', userId)
        .single();
      
      const dnaAnswers = profile?.dna_answers || {};
      const isDnaComplete = Object.values(dnaAnswers).filter((v: any) => v && v.toString().length > 2).length >= 7;

      if (force || !existingIdeas || existingIdeas.length === 0) {
        const categoriesToGenerate = categoryParam ? [categoryParam] : categories;
        
        const allFreshIdeas = [];
        for (const cat of categoriesToGenerate) {
           const fresh = await generateDailyIdeas(userId, cat);
           allFreshIdeas.push(...fresh);
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
    const cookieStore = cookies();
    const authorizedSupabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { ideaId, status, metadata } = await req.json();

    const updateData: any = { status };
    if (metadata) {
      updateData.metadata = metadata;
    }

    if (status === 'archived') {
       // We usually set a flag in metadata rather than changing status string if we want to keep it in 'new' but hidden
       // But here we'll just update status or metadata based on how the UI calls it
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
