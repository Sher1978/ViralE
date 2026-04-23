import * as dotenv from 'dotenv';
import path from 'path';
import { 
  distillSyntheticKnowledge, 
  synthesizeDigitalShadow, 
  generateScript,
  updateDnaPersona 
} from '../src/lib/ai/gemini';
import { ReplicateVideoGenerator } from '../src/lib/video';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTests() {
  console.log('🚀 Starting Viral Engine AI Diagnostics...\n');

  // 1. Test Gemini Connection & Knowledge Distillation
  console.log('--- 1. Testing Gemini: Knowledge Distillation ---');
  try {
    const rawData = "The creator of this content is a software engineer who loves minimalist design. They believe that code should be self-documenting. They often talk about clean architecture and the beauty of type safety.";
    const distillation = await distillSyntheticKnowledge(rawData, 'en');
    console.log('✅ Distillation Success:');
    console.log(distillation);
  } catch (err: any) {
    console.error('❌ Distillation Failed:', err.message);
  }
  console.log('');

  // 2. Test DNA Synthesis
  console.log('--- 2. Testing Gemini: DNA Synthesis ---');
  try {
    const onboardingData = {
      expertise: "AI Engineering",
      tone: "Scientific but accessible",
      worldview: "Accelerating human progress through code"
    };
    const dna = await synthesizeDigitalShadow(onboardingData, 'en');
    console.log('✅ DNA Synthesis Success:');
    console.log(dna);
  } catch (err: any) {
    console.error('❌ DNA Synthesis Failed:', err.message);
  }
  console.log('');

  // 3. Test Script Generation
  console.log('--- 3. Testing Gemini: Script Generation ---');
  try {
    const idea = "How AI agents are changing the software development lifecycle";
    const shadow = "Expert AI Engineer, minimalist, ironic tone.";
    const script = await generateScript(idea, shadow, 'en');
    console.log('✅ Script Generation Success:');
    console.log(JSON.stringify(script, null, 2));
  } catch (err: any) {
    console.error('❌ Script Generation Failed:', err.message);
  }
  console.log('');

  // 4. Test Replicate Image Generation (Flux)
  console.log('--- 4. Testing Replicate: Image Generation (Flux) ---');
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      const generator = new ReplicateVideoGenerator();
      console.log('⏳ Attempting to generate one frame via Replicate flux-dev...');
      const imageUrl = await generator.generatePreviewFrame("A futuristic laboratory with holographic displays and minimalist aesthetic, cinematic lighting, 4k", "landscape");
      console.log('✅ Replicate Success! Frame URL:');
      console.log(imageUrl);
    } catch (err: any) {
      console.error('❌ Replicate Failed:', err.message);
    }
  } else {
    console.log('⚠️ Skipping Replicate test (REPLICATE_API_TOKEN not found)');
  }

  console.log('\n✅ Diagnostics Complete.');
}

runTests();
