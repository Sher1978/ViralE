import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const targetEmail = 'shersshadowcapital@gmail.com';
    console.log(`[Debug-Credit] Triggering credit update for email: ${targetEmail}`);

    // 1. List auth users using supabaseAdmin
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('[Debug-Credit] Failed to list auth users:', listError);
      return NextResponse.json({ error: 'Failed to list auth users', details: listError.message }, { status: 500 });
    }

    const user = users.find((u: any) => u.email?.toLowerCase() === targetEmail.toLowerCase() || u.email?.toLowerCase().includes('shadow'));

    if (!user) {
      console.error(`[Debug-Credit] User ${targetEmail} not found`);
      const allEmails = users.map((u: any) => u.email).filter(Boolean);
      return NextResponse.json({ 
        error: `User with email ${targetEmail} not found`, 
        availableEmails: allEmails 
      }, { status: 404 });
    }

    console.log(`[Debug-Credit] Found user. ID: ${user.id}`);

    // 2. Fetch current profile
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[Debug-Credit] Failed to fetch profile:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch profile', details: fetchError.message }, { status: 500 });
    }

    // 3. Force update credits_balance to 10000 and upgrade tier to pro
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        credits_balance: 10000,
        tier: 'pro'
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Debug-Credit] Failed to update profile:', updateError);
      return NextResponse.json({ error: 'Failed to update profile credits', details: updateError.message }, { status: 500 });
    }

    console.log('[Debug-Credit] SUCCESS! Updated profile:', updatedProfile);

    return NextResponse.json({
      success: true,
      message: `Successfully credited 10000 credits and set tier to PRO for user ${targetEmail}`,
      profile: updatedProfile
    });

  } catch (err: any) {
    console.error('[Debug-Credit] Unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected error', details: err.message }, { status: 500 });
  }
}
