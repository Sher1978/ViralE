import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';

export async function DELETE() {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = user.id;

    // Delete all existing ideas (new, archived, used) for this user to completely clear the matrix
    const { error } = await authorizedSupabase
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
