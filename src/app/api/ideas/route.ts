import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { generateDailyIdeas, saveIdeasToFeed } from '@/lib/ideation';

export async function GET(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const userId = user.id;

    const { searchParams } = new URL(req.url);
    const locale = searchParams.get('locale') || 'en';

    // 1. Check if we already have ideas for today
    const { data: existingIdeas, error: fetchError } = await authorizedSupabase
      .from('ideation_feed')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'new')
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    // 2. If no new ideas, generate fresh ones
    if (!existingIdeas || existingIdeas.length === 0) {
      const freshIdeas = await generateDailyIdeas(authorizedSupabase, userId, locale);
      await saveIdeasToFeed(authorizedSupabase, userId, freshIdeas);
      
      // Fetch them again to get IDs and created_at
      const { data: newlyCreated } = await authorizedSupabase
        .from('ideation_feed')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'new');
        
      return NextResponse.json(newlyCreated);
    }

    return NextResponse.json(existingIdeas);
  } catch (error: any) {
    console.error('Ideation fetch failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const { ideaId, status } = await req.json();

    if (!ideaId || !status) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const userId = user.id;

    // Verify Ownership via authorized client
    const { data: idea, error: ideaError } = await authorizedSupabase
      .from('ideation_feed')
      .select('user_id')
      .eq('id', ideaId)
      .single();

    if (ideaError || idea?.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await authorizedSupabase
      .from('ideation_feed')
      .update({ status })
      .eq('id', ideaId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Ideation update failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
