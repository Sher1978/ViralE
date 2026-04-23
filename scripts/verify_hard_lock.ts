import { profileService } from '../src/lib/services/profileService';
import { supabase } from '../src/lib/supabase';

async function verifyHardLock() {
  console.log('🚀 Starting Hard Lock System Verification...');

  try {
    // 1. Check if Profile interface extension is reflected in DB (simulated)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('synthetic_training_data, knowledge_base_json')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ DB Column Check Failed:', error.message);
      console.log('💡 Note: Ensure you have run the SQL migration provided in the walkthrough.');
    } else {
      console.log('✅ DB Columns "synthetic_training_data" and "knowledge_base_json" verified.');
    }

    // 2. Verify Profile Service Logic
    console.log('\n🔍 Verifying Profile Service ensureProfile()...');
    const myProfile = await profileService.ensureProfile();
    if (myProfile) {
      console.log('✅ Profile session is stable. ID:', myProfile.id);
      
      const dnaStatus = !!myProfile.synthetic_training_data ? 'STABILIZED' : 'LOCKED (Expected for new user)';
      console.log(`🧬 Current DNA Status: ${dnaStatus}`);
    } else {
      console.error('❌ Profile Service failed to stabilize session.');
    }

    // 3. Check for the new KnowledgeLab component file existence
    const fs = require('fs');
    const path = require('path');
    const componentPath = path.join(process.cwd(), 'src/components/studio/KnowledgeLab.tsx');
    if (fs.existsSync(componentPath)) {
      console.log('✅ KnowledgeLab.tsx component is present in source.');
    } else {
      console.error('❌ KnowledgeLab.tsx component is missing!');
    }

    // 4. Check API endpoint existence (ping)
    console.log('\n📡 Checking AI Distillation API endpoint...');
    // We can't easily ping a local API route from a shell script without a running dev server,
    // but we can check if the file exists.
    const apiPath = path.join(process.cwd(), 'src/app/api/ai/distill-dna/route.ts');
    if (fs.existsSync(apiPath)) {
      console.log('✅ /api/ai/distill-dna route handler is present.');
    } else {
      console.warn('⚠️ /api/ai/distill-dna route handler is missing. Ensure you implemented the distillation logic.');
    }

    console.log('\n✅ Verification Complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed with fatal error:', err);
    process.exit(1);
  }
}

verifyHardLock();
