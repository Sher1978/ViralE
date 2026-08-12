import { NextRequest, NextResponse } from 'next/server';
import { runCinematicMultiAgentPipeline } from '@/lib/ai/remotion/cinematicPipeline';
import { UserBrandDnaConfig } from '@/lib/types/remotionArchitect';
import { notifyAdminError } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcriptData, nicheProfile, userIntent, presetKey, userBrandDna, fps = 30, projectId } = body;

    if (!transcriptData || !Array.isArray(transcriptData)) {
      return NextResponse.json({
        success: false,
        error: 'ОШИБКА ЭТАПА 2: Неверный формат данных транскрипта (transcriptData must be a valid array)',
        stage: 'AI_PROMPT_PREPARATION'
      }, { status: 400 });
    }

    const brandDna: UserBrandDnaConfig = userBrandDna || {
      accentColor: nicheProfile?.accentColor,
      stylePreset: presetKey || nicheProfile?.stylePreset || 'minimal_expert',
      niche: nicheProfile?.type || 'business'
    };

    const cutSheet = await runCinematicMultiAgentPipeline({
      transcriptData,
      userBrandDna: brandDna,
      presetKey: presetKey || brandDna.stylePreset || 'minimal_expert',
      userIntent: userIntent || 'High Retention dynamic motion edit',
      fps
    });

    if (!cutSheet || !Array.isArray(cutSheet.cameraCuts) || !Array.isArray(cutSheet.bRollElements)) {
      const errorMsg = 'ОШИБКА ЭТАПА 2: Мультиагентная ИИ-сеть вернула некорректную структуру монтажного листа (cutSheet is null or invalid schema)';
      
      // Notify Telegram Admin Bot
      await notifyAdminError({
        source: 'Remotion Architect API (Stage 2)',
        error: errorMsg,
        extra: { projectId, cutSheet }
      });

      return NextResponse.json({
        success: false,
        error: errorMsg,
        stage: 'AI_JSON_PARSE_ERROR',
        details: 'ИИ вернул невалидный JSON. Задействован процедурный фолбэк.'
      }, { status: 522 });
    }

    return NextResponse.json({ success: true, cutSheet });
  } catch (error: any) {
    const errorMsg = `ОШИБКА ЭТАПА 2: Сбой мультиагентного ИИ-конвейера: ${error.message || String(error)}`;
    console.error('[RemotionArchitect] Route Error:', error);

    await notifyAdminError({
      source: 'Remotion Architect API (Stage 2 Exception)',
      error: error.message || String(error),
      extra: { stack: error.stack }
    });

    return NextResponse.json({
      success: false,
      error: errorMsg,
      stage: 'AI_PIPELINE_EXCEPTION',
      details: error.stack || String(error)
    }, { status: 500 });
  }
}
