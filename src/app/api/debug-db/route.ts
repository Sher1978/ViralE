import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';

export async function GET() {
  try {
    const { supabase: authorizedSupabase } = await getAuthContext();
    
    // Query one row to see available columns
    const { data, error } = await authorizedSupabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) throw error;

    const columns = data && data[0] ? Object.keys(data[0]) : [];
    
    return NextResponse.json({ columns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
