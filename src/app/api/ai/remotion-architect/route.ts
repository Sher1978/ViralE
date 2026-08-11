import { NextRequest, NextResponse } from 'next/server';
import { runCinematicMultiAgentPipeline } from '@/lib/ai/remotion/cinematicPipeline';
import { UserBrandDnaConfig } from '@/lib/types/remotionArchitect';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcriptData, nicheProfile, userIntent, presetKey, userBrandDna, fps = 30 } = body;

    if (!transcriptData || !Array.isArray(transcriptData)) {
      return NextResponse.json({ error: 'transcriptData must be a valid array' }, { status: 400 });
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

    return NextResponse.json({ success: true, cutSheet });
  } catch (error: any) {
    console.error('[RemotionArchitect] Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}

