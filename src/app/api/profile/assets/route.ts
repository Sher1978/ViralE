import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * API Route for User Media Assets Library.
 * Handles fetching, creating, and deleting photo/video assets.
 */

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    
    // 1. Get all projects belonging to the authenticated user
    const { data: userProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id);
      
    if (projectsError) throw projectsError;
    
    const projectIds = userProjects?.map((p: any) => p.id) || [];
    if (projectIds.length === 0) {
      return NextResponse.json({ assets: [] });
    }
    
    // 2. Fetch all media assets across these projects
    const { data: assets, error: assetsError } = await supabase
      .from('media_assets')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });

    if (assetsError) throw assetsError;

    // Map columns to match the expected frontend structure (url and type)
    const mappedAssets = (assets || []).map((asset: any) => ({
      id: asset.id,
      url: asset.public_url,
      type: asset.asset_type === 'image' ? 'photo' : asset.asset_type,
      metadata: asset.metadata,
      created_at: asset.created_at,
      project_id: asset.project_id
    }));

    return NextResponse.json({ assets: mappedAssets });
  } catch (error: any) {
    console.error('Fetch assets failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { url, type = 'photo', metadata = {}, projectId } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'Missing asset URL' }, { status: 400 });
    }

    // Ensure we have a valid project ID
    let targetProjectId = projectId;
    if (!targetProjectId) {
      const { data: latestProject } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
        
      targetProjectId = latestProject?.[0]?.id;
    }

    if (!targetProjectId) {
      return NextResponse.json({ error: 'Please create a project first before uploading assets.' }, { status: 400 });
    }

    const file_path = url.split('/media/').pop() || `avatars/uploaded_${Date.now()}.jpg`;

    const { data: asset, error } = await supabase
      .from('media_assets')
      .insert({
        project_id: targetProjectId,
        public_url: url,
        file_path,
        asset_type: type === 'photo' || type === 'talking_photo' ? 'image' : type,
        metadata
      })
      .select()
      .single();

    if (error) throw error;

    const mappedAsset = {
      id: asset.id,
      url: asset.public_url,
      type: asset.asset_type === 'image' ? 'photo' : asset.asset_type,
      metadata: asset.metadata,
      created_at: asset.created_at,
      project_id: asset.project_id
    };

    return NextResponse.json({ asset: mappedAsset });
  } catch (error: any) {
    console.error('Create asset failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing asset ID' }, { status: 400 });
    }

    // Verify ownership of the asset by checking if its project belongs to the user
    const { data: assetData, error: assetFetchError } = await supabase
      .from('media_assets')
      .select('project_id')
      .eq('id', id)
      .single();

    if (assetFetchError || !assetData) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const { data: projectData } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', assetData.project_id)
      .single();

    if (!projectData || projectData.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this asset' }, { status: 403 });
    }

    const { error } = await supabase
      .from('media_assets')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete asset failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
