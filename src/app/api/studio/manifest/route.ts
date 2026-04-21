import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const { projectId, manifest, name } = await req.json();

    if (!projectId || !manifest) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Insert a new version of the manifest
    // The database trigger will automatically set is_active=false for previous ones
    const { data: newManifest, error } = await authorizedSupabase
      .from('studio_manifests')
      .insert({
        project_id: projectId,
        manifest_json: manifest,
        name: name || `Draft ${new Date().toLocaleTimeString()}`,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      manifestId: newManifest.id 
    });

  } catch (error: any) {
    console.error('Manifest save failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Fetch the latest active manifest for this project
    const { data, error } = await authorizedSupabase
      .from('studio_manifests')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "No rows found"

    return NextResponse.json({ 
      manifest: data?.manifest_json || null,
      updatedAt: data?.updated_at || null
    });

  } catch (error: any) {
    console.error('Manifest fetch failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
