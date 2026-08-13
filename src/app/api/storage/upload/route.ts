import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/lib/services/storageService';

export const maxDuration = 60; // Allow long uploads up to 60s

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const path = (formData.get('path') as string) || 'uploads';
    const bucket = (formData.get('bucket') as string) || 'media';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const publicUrl = await storageService.uploadFileDirect(file, path, bucket);

    if (!publicUrl) {
      return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: any) {
    console.error('[API /api/storage/upload] Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal upload error' }, { status: 500 });
  }
}
