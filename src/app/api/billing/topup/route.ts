import { NextResponse } from 'next/server';
import { addCredits } from '@/lib/credits';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { amount, packageId } = await req.json();

    if (!amount) {
      return NextResponse.json({ error: 'Missing amount' }, { status: 400 });
    }

    const userId = user.id;

    // MOCK: In production, verify payment package and gateway response here
    await addCredits(supabaseAdmin, userId, amount, 'top_up');

    return NextResponse.json({
      success: true,
      added: amount,
      package: packageId
    });

  } catch (error: any) {
    console.error('Top-up failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
