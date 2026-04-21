import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const userId = user.id;

    const { data, error } = await supabase
      .from('credits_transactions')
      .select(`
        *,
        projects (
          title
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('History fetch failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
