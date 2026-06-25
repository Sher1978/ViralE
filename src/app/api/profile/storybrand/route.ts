import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getModel } from '@/lib/ai/gemini';

const MIGRATION_SQL = `
  ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS storybrand_raw_content TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS storybrand_filename TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS storybrand_file_size INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS storybrand_updated_at TIMESTAMPTZ DEFAULT NULL;

  COMMENT ON COLUMN public.profiles.storybrand_raw_content IS 'Raw parsed text of the uploaded StoryBrand document';
  COMMENT ON COLUMN public.profiles.storybrand_filename IS 'Original name of the uploaded StoryBrand file';
  COMMENT ON COLUMN public.profiles.storybrand_file_size IS 'Size of the uploaded StoryBrand file in bytes';
  COMMENT ON COLUMN public.profiles.storybrand_updated_at IS 'Timestamp of the last StoryBrand file upload/update';
`;

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

    // Extract high-density Digital Shadow DNA prompt using Gemini
    let digitalShadowPrompt = '';
    try {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
      if (apiKey) {
        console.log('[StoryBrand API] Extracting digital shadow persona from StoryBrand document...');
        const model = getModel('fast', 'ru', 'text');
        const extractPrompt = `
          You are an expert AI Persona Architect. 
          Your goal is to distill the following StoryBrand document into a beautiful, high-density, authoritative, and declarative "Digital Shadow DNA" (Master Prompt) in Russian (if the input is primarily Russian) or English.
          Describe the expert's tone of voice, unique methodology, area of expertise, core worldview, and target audience.
          Output ONLY the final declarative, cohesive paragraph (max 300 words). No introduction, no markdown blocks, no bullet points.
          
          USER STORYBRAND DOCUMENT:
          ${text}
        `;
        const result = await model.generateContent(extractPrompt);
        const response = await result.response;
        digitalShadowPrompt = response.text().trim();
        console.log('[StoryBrand API] Successfully extracted Master Prompt:', digitalShadowPrompt.substring(0, 100) + '...');
      }
    } catch (e) {
      console.warn('[StoryBrand API] Failed to extract Digital Shadow persona from StoryBrand:', e);
    }

    let updateResult = await authorizedSupabase
      .from('profiles')
      .update({
        storybrand_raw_content: text,
        storybrand_filename: filename,
        storybrand_file_size: size,
        storybrand_updated_at: new Date().toISOString(),
        ...(digitalShadowPrompt && { digital_shadow_prompt: digitalShadowPrompt })
      })
      .eq('id', userId);

    if (updateResult.error) {
      const errMsg = updateResult.error.message;
      if (errMsg.includes('storybrand_file_size') || errMsg.includes('column') || errMsg.includes('cache')) {
        console.log('[StoryBrand API] storybrand_file_size column missing or cache stale in DB. Running auto-migration...');
        
        const { error: migrationError } = await supabaseAdmin.rpc('exec_sql', { sql: MIGRATION_SQL });
        if (migrationError) {
          console.error('[StoryBrand API] Auto-migration failed:', migrationError.message);
          throw updateResult.error;
        }

        console.log('[StoryBrand API] Auto-migration applied successfully! Retrying profile update...');
        
        updateResult = await authorizedSupabase
          .from('profiles')
          .update({
            storybrand_raw_content: text,
            storybrand_filename: filename,
            storybrand_file_size: size,
            storybrand_updated_at: new Date().toISOString(),
            ...(digitalShadowPrompt && { digital_shadow_prompt: digitalShadowPrompt })
          })
          .eq('id', userId);

        if (updateResult.error) throw updateResult.error;
      } else {
        throw updateResult.error;
      }
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

    let deleteResult = await authorizedSupabase
      .from('profiles')
      .update({
        storybrand_raw_content: null,
        storybrand_filename: null,
        storybrand_file_size: null,
        storybrand_updated_at: null
      })
      .eq('id', userId);

    if (deleteResult.error) {
      const errMsg = deleteResult.error.message;
      if (errMsg.includes('storybrand_file_size') || errMsg.includes('column') || errMsg.includes('cache')) {
        console.log('[StoryBrand API] storybrand_file_size column missing or cache stale in DB on delete. Running auto-migration...');
        
        const { error: migrationError } = await supabaseAdmin.rpc('exec_sql', { sql: MIGRATION_SQL });
        if (migrationError) {
          console.error('[StoryBrand API] Auto-migration failed on delete:', migrationError.message);
          throw deleteResult.error;
        }

        console.log('[StoryBrand API] Auto-migration applied successfully on delete! Retrying profile deletion...');
        
        deleteResult = await authorizedSupabase
          .from('profiles')
          .update({
            storybrand_raw_content: null,
            storybrand_filename: null,
            storybrand_file_size: null,
            storybrand_updated_at: null
          })
          .eq('id', userId);

        if (deleteResult.error) throw deleteResult.error;
      } else {
        throw deleteResult.error;
      }
    }

    console.log(`[StoryBrand API] Deleted successfully, falling back to base DNA.`);
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[StoryBrand API Delete Error]:', err);
    return NextResponse.json({ error: err.message || 'Ошибка удаления СториБренда' }, { status: 500 });
  }
}
