import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const userId = user.id;

    // Fetch credits usage stats
    const { data: usage, error } = await supabase
      .from('credits_transactions')
      .select('amount, transaction_type')
      .eq('user_id', userId);

    if (error) throw error;

    const totalUsed = (usage || [])
      .filter((t: any) => t.amount < 0)
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
      
    const totalAdded = (usage || [])
      .filter((t: any) => t.amount > 0)
      .reduce((sum: number, t: any) => sum + t.amount, 0);
 
    const renderCount = (usage || [])
      .filter((t: any) => t.transaction_type === 'RENDER')
      .length;

    return NextResponse.json({
      totalUsed,
      totalAdded,
      renderCount,
      successRate: 100 // Mock for now
    });

  } catch (error: any) {
    console.error('Stats fetch failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
