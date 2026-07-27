import { NextResponse } from 'next/server';
import { synthesizeDigitalShadow } from '@/lib/ai/gemini';
import { getAuthContext } from '@/lib/auth';
import { notifyDnaCompleted, notifyNewUserRegistration } from '@/lib/telegram';

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const { answers, trafficData, dnaPrompt, locale = 'en' } = await req.json();

    const userId = user.id;

    // 1. Synthesize or Use Provided "DNA" Master Prompt
    let masterPrompt = dnaPrompt;
    if (!masterPrompt && answers) {
      console.log('[Onboarding] Synthesizing DNA for user:', userId);
      masterPrompt = await synthesizeDigitalShadow(answers, locale);
    }

    console.log('[Onboarding] Updating profile for user:', userId, 'Traffic Data:', trafficData);
    
    // Fetch existing credits & onboarding state to award welcome bonus on first onboarding completion
    const { data: existingProf } = await authorizedSupabase
      .from('profiles')
      .select('credits_balance, onboarding_completed')
      .eq('id', userId)
      .single();

    const isFirstTimeOnboarding = !existingProf?.onboarding_completed;
    const currentBalance = existingProf?.credits_balance ?? 0;
    // Grant +100 CR welcome bonus upon completing onboarding for the first time
    const newBalance = isFirstTimeOnboarding ? (currentBalance + 100) : currentBalance;

    const discoverySource = answers?.discoverySource || null;

    const { data, error } = await authorizedSupabase
      .from('profiles')
      .upsert({
        id: userId,
        email: user.email || `anon_${userId}@viral.engine`,
        full_name: user.user_metadata?.full_name || `Media Creator #${parseInt(userId.slice(0, 4), 16) % 10000}`,
        avatar_url: user.user_metadata?.avatar_url || null,
        digital_shadow_prompt: masterPrompt || null,
        synthetic_training_data: masterPrompt || null, // New column
        raw_onboarding_data: {
          ...(answers || {}),
          traffic_data: trafficData || null,
          discovery_source: discoverySource
        },
        dna_answers: answers || null,
        onboarding_completed: true,
        credits_balance: newBalance,
        tier: 'free',
        subscription_status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('[Onboarding] Database upsert failed:', error);
      throw error;
    }

    console.log('[Onboarding] Profile updated successfully for user:', userId);

    // Notify Telegram Admin about new user registration and DNA completion
    notifyNewUserRegistration(data).catch(() => {});
    notifyDnaCompleted({
      userId,
      userEmail: data.email,
      fullName: data.full_name,
      dnaSnippet: masterPrompt,
      trafficData,
      discoverySource
    }).catch(() => {});

    const response = NextResponse.json({
      success: true,
      dna: masterPrompt,
      profile: data
    });

    response.cookies.set('profile_onboarded', 'true', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;

  } catch (error: any) {
    console.error('Onboarding synthesis failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
