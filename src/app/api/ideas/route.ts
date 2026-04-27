import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { generateDailyIdeas, saveIdeasToFeed } from '@/lib/ideation';

export async function GET(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const userId = user.id;

    const { searchParams } = new URL(req.url);
    const locale = searchParams.get('locale') || 'en';
    const requestedStatus = searchParams.get('status') || 'new';

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

    const categories = [
      "Awareness", "Problem", "Solution", "Loyalty", "Fast Sales",
      "Myths", "Comparison", "Educational", "Case Study", "Trends", "Lifestyle", "Future"
    ];

    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      query = query.eq('metadata->>category', categoryParam);
    }

    const { data: existingIdeas, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    // 2. If we asked for 'new' ideas and didn't find enough, generate fresh ones
    if (requestedStatus === 'new') {
      const { data: profile } = await authorizedSupabase
        .from('profiles')
        .select('dna_answers')
        .eq('id', userId)
        .single();
      
      const dnaAnswers = profile?.dna_answers || {};
      const isDnaComplete = Object.values(dnaAnswers).filter((v: any) => v && v.toString().length > 2).length >= 7;

      if (!existingIdeas || existingIdeas.length === 0) {
        const categoriesToGenerate = categoryParam ? [categoryParam] : categories;
        
        const allFreshIdeas = [];
        // Limit initial generation to 2 categories to fit within Vercel's 10s timeout
        let count = 0;
        for (const cat of categoriesToGenerate) {
           try {
             const fresh = await generateDailyIdeas(authorizedSupabase, userId, locale, cat);
             allFreshIdeas.push(...fresh);
             count++;
             if (count >= 2) break; 
           } catch (e) {
             console.error(`Initial generation failed for category ${cat}:`, e);
           }
        }
        
        if (allFreshIdeas.length > 0) {
          await saveIdeasToFeed(authorizedSupabase, userId, allFreshIdeas);
        }
        
        // Fetch again
        let finalQuery = authorizedSupabase
          .from('ideation_feed')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'new');
        
        if (categoryParam) {
          finalQuery = finalQuery.eq('metadata->>category', categoryParam);
        }
        
        const { data: newlyCreated } = await finalQuery;
        return NextResponse.json(newlyCreated || []);
      }
    }

    return NextResponse.json(existingIdeas || []);
  } catch (error: any) {
    console.error('Ideation fetch failed for user:', error);
    
    if (error.message?.includes('TIER_LOCK')) {
      return NextResponse.json({ error: 'TIER_LOCK', message: error.message }, { status: 403 });
    }
    
    if (error.message?.includes('MONTHLY_LIMIT')) {
      return NextResponse.json({ error: 'MONTHLY_LIMIT', message: error.message }, { status: 429 });
    }

    if (error.message?.includes('User personality not found')) {
      return NextResponse.json({ error: 'ONBOARDING_REQUIRED', message: error.message }, { status: 200 });
    }
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
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

    // Verify Ownership and get current metadata
    const { data: idea, error: ideaError } = await authorizedSupabase
      .from('ideation_feed')
      .select('user_id, status, metadata')
      .eq('id', ideaId)
      .single();

    if (ideaError || idea?.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Handle special "archived" logic for ideas
    let updateData: any = { status };
    const currentMetadata = (idea as any).metadata || {};

    if (status === 'archived') {
      // Keep original status but mark as archived
      updateData = { 
        metadata: { ...currentMetadata, archived: true } 
      };
    } else {
      // Unmark as archived if any other status is set
      updateData.metadata = { ...currentMetadata, archived: false };
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
    console.error('Ideation update failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
