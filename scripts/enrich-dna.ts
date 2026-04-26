/**
 * UTILITY SCRIPT: AI-Injected DNA Enrichment
 * Can be run via: npx tsx scripts/enrich-dna.ts --userId "ID" --text "NEW INFO"
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load ENV
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Needs service role for direct admin updates
const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);

async function enrichDna() {
  const args = process.argv.slice(2);
  const userIdIdx = args.indexOf('--userId');
  const textIdx = args.indexOf('--text');

  if (userIdIdx === -1 || textIdx === -1) {
    console.error('Usage: tsx enrich-dna.ts --userId <id> --text "<content>"');
    process.exit(1);
  }

  const userId = args[userIdIdx + 1];
  const newInfo = args[textIdx + 1];

  console.log(`[DNA CLI] Processing enrichment for User: ${userId}...`);

  // 1. Fetch current DNA
  const { data: profile, error: fetchErr } = await supabase
    .from('profiles')
    .select('digital_shadow_prompt')
    .eq('id', userId)
    .single();

  if (fetchErr) throw fetchErr;
  const oldDna = profile.digital_shadow_prompt || '';

  // 2. Synthesize with Gemini
  console.log(`[DNA CLI] Synthesizing with Gemini...`);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `
    You are an AI Persona Architect. Update this Digital Shadow DNA by integrating new information.
    Synthesize it into a cohesive, consistent personality profile. Output ONLY the updated paragraph.
    
    OLD DNA:
    ${oldDna}
    
    NEW UPDATES:
    ${newInfo}
  `;

  const result = await model.generateContent(prompt);
  const updatedDna = result.response.text().trim();

  // 3. Update DB
  console.log(`[DNA CLI] Saving to Supabase...`);
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ 
        digital_shadow_prompt: updatedDna,
        knowledge_base_json: { 
            last_cli_update: new Date().toISOString(),
            source: 'Antigravity_Assistant' 
        } 
    })
    .eq('id', userId);

  if (updateErr) throw updateErr;

  console.log('✅ BRAND DNA SUCCESSFULLY EVOLVED.');
  console.log('--- REFINED PERSONA ---');
  console.log(updatedDna);
}

enrichDna().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
