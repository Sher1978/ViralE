import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const { title, ideaId } = await req.json();

    const userId = user.id;

    // --- ONBOARDING CHECK ---
    const { data: profile } = await authorizedSupabase
      .from('profiles')
      .select('digital_shadow_prompt')
      .eq('id', userId)
      .single();

    // Note: We used to block here with 403 if DNA was missing.
    // Now we allow proceeding with a "default expert" fallback for a smoother UX.
    // The UI should display a notice if profile?.digital_shadow_prompt is null.
    // ------------------------

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
      const statusList = status.split(',');
      if (statusList.length === 1 && statusList[0] === 'archived') {
        // Special case for archive page: projects with archived: true in metadata
        query = query.eq('status', 'completed').eq('metadata->archived', true);
      } else {
        // Regular filters: exclude archived projects by default
        query = query.in('status', statusList.filter(s => s !== 'archived'))
          .or('metadata->archived.is.null,metadata->archived.eq.false');
      }
    } else {
      // Default: exclude archived projects from the main list
      query = query.or('metadata->archived.is.null,metadata->archived.eq.false');
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

export async function PATCH(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const { projectId, status } = await req.json();

    if (!projectId || !status) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const userId = user.id;

    // Verify Ownership
    const { data: project, error: projectError } = await authorizedSupabase
      .from('projects')
      .select('user_id, metadata')
      .eq('id', projectId)
      .single();

    if (projectError || project?.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle special "archived" logic
    let updateData: any = { status };
    if (status === 'archived') {
      const currentMetadata = (project as any).metadata || {};
      updateData = { 
        status: 'completed', 
        metadata: { ...currentMetadata, archived: true } 
      };
    } else {
      // If we are setting any other status, ensure archived is false/null
      const currentMetadata = (project as any).metadata || {};
      if (currentMetadata.archived) {
        updateData.metadata = { ...currentMetadata, archived: false };
      }
    }

    const { data, error } = await authorizedSupabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Project update failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
