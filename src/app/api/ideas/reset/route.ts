import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE() {
  try {
    const { user } = await getAuthContext();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = user.id;

    // Delete using supabaseAdmin to bypass RLS restrictions
    const { error } = await supabaseAdmin
      .from('ideation_feed')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reset Ideas API Error:', error);
    return new NextResponse(error.message || 'Internal Error', { status: 500 });
  }
}
