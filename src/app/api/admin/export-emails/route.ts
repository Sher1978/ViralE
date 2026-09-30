import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // 1. Verify admin access
    const { user } = await getAuthContext();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single();

    if (profile?.tier !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Fetch all users
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, created_at, tier, telegram_id, credits_balance')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // 3. Convert to CSV
    const header = 'id,email,full_name,created_at,tier,telegram_id,credits_balance\n';
    const rows = users.map(u => 
      `"${u.id}","${u.email}","${(u.full_name || '').replace(/"/g, '""')}","${u.created_at}","${u.tier}","${u.telegram_id || ''}",${u.credits_balance}`
    ).join('\n');

    const csvData = header + rows;

    // 4. Return as downloadable file
    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error: any) {
    console.error('[Export Emails] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
