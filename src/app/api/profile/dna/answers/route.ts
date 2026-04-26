import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const userId = user.id;
    const { answers } = await req.json();

    if (!answers) {
      return NextResponse.json({ error: 'Missing answers' }, { status: 400 });
    }

    // Save answers to profile
    const { error } = await authorizedSupabase
      .from('profiles')
      .update({
        dna_answers: answers,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save DNA answers failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
