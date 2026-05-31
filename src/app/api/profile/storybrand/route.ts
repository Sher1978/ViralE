import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const userId = user.id;

    const { text, filename, size } = await req.json();

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Текст СториБренда слишком короткий (микро-документы не поддерживаются, минимум 50 символов)' },
        { status: 400 }
      );
    }

    console.log(`[StoryBrand API] Saving uploaded file "${filename}" (${size} bytes) for user ${userId}...`);

    const { error } = await authorizedSupabase
      .from('profiles')
      .update({
        storybrand_raw_content: text,
        storybrand_filename: filename,
        storybrand_file_size: size,
        storybrand_updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('[StoryBrand API] DB update failed:', error.message);
      throw error;
    }

    console.log(`[StoryBrand API] Saved successfully!`);
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[StoryBrand API Error]:', err);
    return NextResponse.json({ error: err.message || 'Ошибка сохранения СториБренда' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const userId = user.id;

    console.log(`[StoryBrand API] Deleting StoryBrand content for user ${userId}...`);

    const { error } = await authorizedSupabase
      .from('profiles')
      .update({
        storybrand_raw_content: null,
        storybrand_filename: null,
        storybrand_file_size: null,
        storybrand_updated_at: null
      })
      .eq('id', userId);

    if (error) {
      console.error('[StoryBrand API] DB deletion failed:', error.message);
      throw error;
    }

    console.log(`[StoryBrand API] Deleted successfully, falling back to base DNA.`);
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[StoryBrand API Delete Error]:', err);
    return NextResponse.json({ error: err.message || 'Ошибка удаления СториБренда' }, { status: 500 });
  }
}
