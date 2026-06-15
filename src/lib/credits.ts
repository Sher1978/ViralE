import { SupabaseClient } from '@supabase/supabase-js';

export const CREDIT_COSTS = {
  GENERATE_SCRIPT: 10,
  GENERATE_STORYBOARD: 10,
  ANIMATION_LITE: 0,
  ANIMATION_STANDARD: 25,
  ANIMATION_PREMIUM: 50,
  AI_LOOK_POLISH: 10,
  RENDER_PREVIEW: 5,
  PRO_RENDER: 50,
  AVATAR_HEYGEN: 50,
  AVATAR_HIGGSFIELD: 15,
  REGENERATE_BLOCK: 10,
  HEYGEN_AVATAR_4_PER_MIN: 50,
  HEYGEN_AVATAR_VIDEO_PER_MIN: 20,
};

export const REGENERATE_THRESHOLD = 50;

export async function checkBalance(supabase: SupabaseClient, userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('credits_balance')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        // Create profile if missing
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({ id: userId, credits_balance: 50 })
          .select('credits_balance')
          .single();
        
        if (createError) throw createError;
        return newProfile.credits_balance;
      }
      throw error;
    }
    return data?.credits_balance || 0;
  } catch (err) {
    console.warn(`checkBalance failed for ${userId}, falling back to 0:`, err);
    return 0;
  }
}

export async function deductCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  type: string,
  projectId?: string,
  forceDeduct: boolean = false,
  metadata?: any
) {
  // 1. Fetch current balance & tier
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('credits_balance, tier')
    .eq('id', userId)
    .single();

  if (fetchError) throw fetchError;

  // Bypass credit deduction entirely for free tier users (renders with watermark) unless forceDeduct is true
  if (profile?.tier === 'free' && !forceDeduct) {
    console.log(`[Credits] User ${userId} is on FREE tier, bypassing credit deduction of ${amount} credits.`);
    return true;
  }

  const currentBalance = profile?.credits_balance || 0;

  if (currentBalance < amount) {
    const shotstackApiKey = process.env.SHOTSTACK_API_KEY || '';
    const isStage = shotstackApiKey.startsWith('v1-stage-') || process.env.NODE_ENV === 'development' || !shotstackApiKey;
    
    if (isStage) {
      console.warn(`[Credits] Insufficient credits (${currentBalance} < ${amount}) but allowing render in Sandbox/Stage environment!`);
      return true;
    }
    throw new Error('INSUFFICIENT_CREDITS');
  }

  // 2. Deduct credits with optimistic locking
  // We only update if the balance is still what we just read
  const { data, error: updateError } = await supabase
    .from('profiles')
    .update({ 
      credits_balance: currentBalance - amount
    })
    .eq('id', userId)
    .eq('credits_balance', currentBalance)
    .select(); // select() returns the updated row(s)

  if (updateError) throw updateError;
  
  // If no row was updated (data is empty), it means the balance changed concurrently
  if (!data || data.length === 0) {
    // Retry once or throw error
    console.warn(`[Credits] Optimistic lock failed for ${userId}. Retrying...`);
    return deductCredits(supabase, userId, amount, type, projectId, forceDeduct, metadata);
  }

  // 3. Log transaction
  const { error: logError } = await supabase
    .from('credits_transactions')
    .insert({
      user_id: userId,
      amount: -amount,
      transaction_type: type,
      project_id: projectId,
      metadata: metadata || {},
    });

  if (logError) {
    console.error('Failed to log credit transaction:', logError);
  }

  return true;
}

export async function addCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  type: string = 'top_up',
  metadata?: any
) {
  const balance = await checkBalance(supabase, userId);
  
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      credits_balance: balance + amount
    })
    .eq('id', userId);

  if (updateError) throw updateError;

  const { error: logError } = await supabase
    .from('credits_transactions')
    .insert({
      user_id: userId,
      amount: amount,
      transaction_type: type,
      metadata: metadata || {},
    });

  if (logError) throw logError;

  return true;
}
