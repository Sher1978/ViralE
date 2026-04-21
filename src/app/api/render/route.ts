import { NextResponse } from 'next/server';
import { createRenderJob, getRenderStatus } from '@/lib/render';
import { getAuthContext } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const { projectId, versionId, type } = await req.json();

    if (!projectId || !versionId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const userId = user.id;

    // Verify Project Ownership via authorized client
    const { data: project, error: projectError } = await authorizedSupabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single();

    if (projectError || project?.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify Version Ownership via authorized client
    const { data: versionCheck, error: versionCheckError } = await authorizedSupabase
      .from('project_versions')
      .select('project_id')
      .eq('id', versionId)
      .single();

    if (versionCheckError || versionCheck?.project_id !== projectId) {
      return NextResponse.json({ error: 'Invalid version reference' }, { status: 400 });
    }

    const job = await createRenderJob(authorizedSupabase, userId, projectId, versionId, type || 'preview');

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status
    });

  } catch (error: any) {
    console.error('Render request failed:', error);
    if (error.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
    }
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

    const userId = user.id;

    // Verify Project Ownership via authorized client
    const { data: project, error: projectError } = await authorizedSupabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single();

    if (projectError || project?.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const status = await getRenderStatus(authorizedSupabase, projectId);
    return NextResponse.json(status);

  } catch (error: any) {
    console.error('Render status fetch failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
