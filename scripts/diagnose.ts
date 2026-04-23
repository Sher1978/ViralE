import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function diagnose() {
  console.log('🚀 Starting Viral Engine Diagnostics...\n');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  
  // 1. Check Connectivity
  console.log('🔗 Checking Supabase connectivity...');
  const { data: health, error: healthError } = await anonClient.from('profiles').select('count', { count: 'exact', head: true });
  
  if (healthError) {
    console.error('❌ Connectivity Failed:', healthError.message);
  } else {
    console.log('✅ Connected to Supabase.');
  }

  // 2. Check Tables
  const tables = ['profiles', 'projects', 'project_versions', 'ideation_feed', 'avatars'];
  console.log('\n📊 Checking tables...');
  
  for (const table of tables) {
    const { error } = await anonClient.from(table).select('*').limit(1);
    // Error is expected if RLS is on and we are not authed, but it should be a "policy" error, not a "404 table not found"
    if (error && error.code === 'PGRST116') {
       // Table exists but no results
       console.log(`✅ Table [${table}] exists.`);
    } else if (error && error.message.includes('does not exist')) {
       console.error(`❌ Table [${table}] NOT FOUND!`);
    } else {
       console.log(`✅ Table [${table}] reachable (RLS status unknown).`);
    }
  }

  // 3. Test AI Generation Service
  console.log('\n🤖 Testing Gemini AI Service...');
  try {
    const { model } = await import('../src/lib/ai/gemini');
    
    console.log('⏳ Sending test prompt...');
    const result = await model.generateContent('Say "AI is working"');
    const response = await result.response;
    const text = response.text().trim();
    
    if (text) {
        console.log(`✅ AI Response: ${text}`);
    } else {
        throw new Error('Empty response from AI');
    }
  } catch (err: any) {
    console.error('❌ AI Failed:', err.message);
    if (err.message.includes('not found')) {
        console.log('💡 Tip: Your API key might not have access to this model or it is restricted.');
    }
    if (err.message.includes('API key not valid')) {
        console.log('💡 Tip: Check your GOOGLE_GENERATIVE_AI_API_KEY in .env.local');
    }
  }

  // 4. Check for existing users to test RLS properly
  if (supabaseServiceKey) {
     const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
     console.log('\n🔑 Checking users with Service Role...');
     const { data: users, error: userError } = await serviceClient.from('profiles').select('id, email').limit(5);
     
     if (userError) {
         console.warn('⚠️  Could not fetch users with Service Role:', userError.message);
     } else if (users && users.length > 0) {
         console.log(`✅ Found ${users.length} profiles.`);
         const testUser = users[0];
         console.log(`🧪 Testing Ideation for user: ${testUser.email}`);
         
         // Mock the generation flow
         const { generateDailyIdeas } = await import('../src/lib/ideation');
         try {
             const ideas = await (generateDailyIdeas as any)(serviceClient, testUser.id);
             console.log(`✅ Generated ${ideas.length} ideas successfully.`);
         } catch (err: any) {
             console.error('❌ Ideation Service Failed:', err.message);
         }
     } else {
         console.log('ℹ️  No profiles found in database. Generation will fail for users.');
     }
  }

  console.log('\n🏁 Diagnostics Complete.');
}

diagnose().catch(console.error);
