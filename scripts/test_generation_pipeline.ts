import * as dotenv from 'dotenv';
import path from 'path';
import { runCinematicMultiAgentPipeline } from '../src/lib/ai/remotion/cinematicPipeline';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testGeneration() {
  console.log('==================================================');
  console.log('🧪 TEST GENERATION PIPELINE DIAGNOSTIC');
  console.log('==================================================\n');

  console.log('🔑 Checking API Keys...');
  console.log('  - GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✅ Present' : '❌ Missing');
  console.log('  - GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Present' : '❌ Missing');
  console.log('  - FAL_KEY:', process.env.FAL_KEY ? '✅ Present' : '❌ Missing');

  const testTranscript = [
    { start: 0, end: 3, text: 'Привет! Сегодня я расскажу, как увеличить конверсию вашего бизнеса на 300%.' },
    { start: 3, end: 7, text: 'Первая главная проблема большинства предпринимателей — это отсутствие системного маркетинга.' },
    { start: 7, end: 12, text: 'Когда вы внедряете автоворонку и ИИ-дикторов, удержание клиентов вырастает в три раза.' },
    { start: 12, end: 16, text: 'Подписывайтесь на канал, чтобы получить пошаговую схему прямо сейчас!' }
  ];

  console.log('\n🎬 1. Testing Cinematic Multi-Agent Pipeline...');
  console.log('Input transcript items:', testTranscript.length);

  try {
    const cutSheet = await runCinematicMultiAgentPipeline({
      transcriptData: testTranscript,
      presetKey: 'minimal_expert',
      userIntent: 'High Retention dynamic motion edit',
      fps: 30
    });

    console.log('\n📊 RESULTING CUT SHEET:');
    console.log(JSON.stringify(cutSheet, null, 2));

    console.log('\n🔍 DIAGNOSTIC FINDINGS:');
    console.log('Camera Cuts count:', cutSheet.cameraCuts?.length || 0);
    console.log('BRoll Elements count:', cutSheet.bRollElements?.length || 0);
    console.log('Sound Cues count:', cutSheet.soundCues?.length || 0);

    const hasProceduralDummyText = cutSheet.bRollElements?.some(e => 
      e.props?.title === 'Рост удержания' || 
      e.props?.items?.includes('Живая Z-камера') ||
      e.props?.items?.includes('Простота')
    );

    if (hasProceduralDummyText) {
      console.log('\n⚠️ WARNING: CutSheet fell back to procedural DUMMY text hardcoded fallback!');
    } else {
      console.log('\n✅ CutSheet was generated dynamically by AI Agents!');
    }

  } catch (err: any) {
    console.error('\n❌ PIPELINE ERROR:', err.message || err);
  }
}

testGeneration();
