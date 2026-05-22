import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// GET /api/profile/photos — list all user photos
export async function GET(req: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const folder = `avatars/${user.id}`;
    const { data: files, error } = await supabaseAdmin.storage
      .from('media')
      .list(folder, { sortBy: { column: 'created_at', order: 'desc' } });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const photos = (files || [])
      .filter((f: any) => f.name !== '.emptyFolderPlaceholder')
      .map((f: any) => {
        const path = `${folder}/${f.name}`;
        const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(path);
        return {
          name: f.name,
          path,
          url: publicUrl,
          size: f.metadata?.size || 0,
          createdAt: f.created_at,
        };
      });

    return NextResponse.json({ photos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/profile/photos — delete a specific photo by path
export async function DELETE(req: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { path } = await req.json();
    if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

    // Security check: ensure the file belongs to this user
    if (!path.startsWith(`avatars/${user.id}/`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabaseAdmin.storage.from('media').remove([path]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
