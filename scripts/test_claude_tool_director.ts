import dotenv from 'dotenv';
dotenv.config();

import { generateVideoTimelineViaTools } from '../src/lib/ai/remotion/claudeToolDirector';
import { runCinematicMultiAgentPipeline } from '../src/lib/ai/remotion/cinematicPipeline';

async function runTest() {
  console.log('=== TESTING CLAUDE 3.5 SONNET TOOL CALLING DIRECTOR AGENT ===');

  const mockTranscript = [
    { start: 0.0, end: 3.5, text: 'Как увеличить продажи в 3 раза за один месяц без бюджета?' },
    { start: 3.6, end: 8.5, text: 'Смотрите, главная ошибка 90% предпринимателей — фокус на новом трафике.' },
    { start: 8.6, end: 14.0, text: 'Данные показывают: рост конверсии на повторных продажах дает +350% к чистой прибыли.' },
    { start: 14.1, end: 18.0, text: 'Оставляйте слово СИСТЕМА в комментариях, чтобы получить чек-лист.' }
  ];

  const startTime = Date.now();

  try {
    const cutSheet = await runCinematicMultiAgentPipeline({
      transcriptData: mockTranscript,
      presetKey: 'minimal_expert',
      userIntent: 'High Retention Viral Edit',
      fps: 30
    });

    console.log(`\n✅ Pipeline Executed Successfully in ${Date.now() - startTime}ms`);
    console.log(`Provider: ${cutSheet.qaDiagnostics?.provider}`);
    console.log(`Camera Cuts Count: ${cutSheet.cameraCuts.length}`);
    console.log(`BRoll Elements Count: ${cutSheet.bRollElements.length}`);
    console.log(`Sound Cues Count: ${cutSheet.soundCues?.length || 0}`);

    console.log('\n--- CAMERA CUTS ---');
    console.dir(cutSheet.cameraCuts, { depth: null });

    console.log('\n--- B-ROLL ELEMENTS ---');
    console.dir(cutSheet.bRollElements, { depth: null });

    // Validate 30 FPS timing calculations
    let timingError = false;
    for (const elem of cutSheet.bRollElements) {
      if (typeof elem.startFrame !== 'number' || typeof elem.endFrame !== 'number') {
        console.error(`❌ Element ${elem.id} missing startFrame/endFrame!`);
        timingError = true;
      }
      if (elem.startFrame >= elem.endFrame) {
        console.error(`❌ Element ${elem.id} invalid timing range: ${elem.startFrame} >= ${elem.endFrame}`);
        timingError = true;
      }
    }

    if (!timingError) {
      console.log('\n✅ All Frame Timings (30 FPS) Validated Successfully!');
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test execution failed with exception:', err);
    process.exit(1);
  }
}

runTest();
