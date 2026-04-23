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
          .insert({ id: userId, credits_balance: 50, updated_at: new Date().toISOString() })
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
  projectId?: string
) {
  // 1. Fetch current balance
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single();

  if (fetchError) throw fetchError;
  const currentBalance = profile?.credits_balance || 0;

  if (currentBalance < amount) {
    throw new Error('INSUFFICIENT_CREDITS');
  }

  // 2. Deduct credits with optimistic locking
  // We only update if the balance is still what we just read
  const { data, error: updateError } = await supabase
    .from('profiles')
    .update({ 
      credits_balance: currentBalance - amount,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .eq('credits_balance', currentBalance)
    .select(); // select() returns the updated row(s)

  if (updateError) throw updateError;
  
  // If no row was updated (data is empty), it means the balance changed concurrently
  if (!data || data.length === 0) {
    // Retry once or throw error
    console.warn(`[Credits] Optimistic lock failed for ${userId}. Retrying...`);
    return deductCredits(supabase, userId, amount, type, projectId);
  }

  // 3. Log transaction
  const { error: logError } = await supabase
    .from('credits_transactions')
    .insert({
      user_id: userId,
      amount: -amount,
      transaction_type: type,
      project_id: projectId,
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
  type: 'top_up' | 'bonus' = 'top_up'
) {
  const balance = await checkBalance(supabase, userId);
  
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      credits_balance: balance + amount,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (updateError) throw updateError;

  const { error: logError } = await supabase
    .from('credits_transactions')
    .insert({
      user_id: userId,
      amount: amount,
      transaction_type: type,
    });

  if (logError) throw logError;

  return true;
}
