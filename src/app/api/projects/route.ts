import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const { title, ideaId } = await req.json();

    const userId = user.id;

    let projectTitle = title || 'Untitled Project';
    let inputSource = null;

    // If ideaId is provided, fetch topic details and mark as used
    if (ideaId) {
      const { data: idea, error: ideaError } = await supabase
        .from('ideation_feed')
        .select('*')
        .eq('id', ideaId)
        .single();
      
      if (!ideaError && idea) {
        projectTitle = idea.topic_title;
        inputSource = idea.topic_title;
        
        // Mark as used
        await supabase
          .from('ideation_feed')
          .update({ status: 'used' })
          .eq('id', ideaId);
      }
    }

    const { data, error } = await authorizedSupabase
      .from('projects')
      .insert({
        user_id: userId,
        title: projectTitle,
        input_source: inputSource,
        status: 'ideation'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error during project creation:', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Project creation failed with full details:', {
      message: error.message,
      stack: error.stack,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    const status = error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ 
      error: error.message,
      details: error.details || null,
      code: error.code || null
    }, { status });
  }
}

export async function GET(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const userId = user.id;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Calculate range for pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = authorizedSupabase
      .from('projects')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Apply Search
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Apply Status Filter
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply Sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply Pagination
    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error('Supabase error during projects fetch:', error);
      throw error;
    }

    return NextResponse.json({
      items: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 0
    });
  } catch (error: any) {
    console.error('Projects fetch failed with full details:', {
      message: error.message,
      stack: error.stack,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    const status = error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ 
      error: error.message,
      details: error.details || null,
      code: error.code || null
    }, { status });
  }
}
