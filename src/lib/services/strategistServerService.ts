import { supabase } from '../supabase';
import fs from 'fs';
import path from 'path';

// --- BIBLE_SOT LOADER ---
function getBibleSOTContent(filename: string): string {
  try {
    const filePath = path.join(process.cwd(), 'Bible_SOT', 'AI_prompts', filename);
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`[BibleSOT] Failed to read ${filename}:`, err);
    return '';
  }
}

function formatDNA(answers: any): string {
  if (!answers) return "Missing DNA. Please conduct interview.";
  
  return `
    🧬 ACTIVE BRAND DNA (Based on user answers):
    
    1. FOUNDATION & EXPERTISE:
       - Niche: ${answers.niche || 'N/A'}
       - Contrarian Views: ${answers.contrarian_views || 'N/A'}
       - Authority/Expertise: ${answers.expertise || 'N/A'}
    
    2. AVATAR (ONE TRUE FAN):
       - Who: ${answers.target_audience || 'N/A'}
       - Deep Fears: ${answers.pain_points || 'N/A'}
       - Desires/Goals: ${answers.desired_results || 'N/A'}
    
    3. TONE & STYLE:
       - Tone of Voice: ${answers.tone_of_voice || 'N/A'}
       - Archetype/Role: ${answers.tone_of_voice || 'N/A'}
    
    4. FUNNEL & OFFERS:
       - Final Offer/Lead Magnet: ${answers.final_offer || 'N/A'}
  `;
}

// --- SERVER-ONLY SERVICE IMPLEMENTATION ---
export const strategistServerService = {
  async getStrategistSystemPrompt(userId: string, locale: string = 'en'): Promise<string> {
    const languageName = locale === 'ru' ? 'Russian' : 'English';
    
    // 1. Check for user-specific Brand_DNA.md file (Priority 1)
    const userFilePath = path.join(process.cwd(), 'Bible_SOT', 'users', userId, 'Brand_DNA.md');
    let dnaContext = '';
    let isDnaComplete = false;

    if (fs.existsSync(userFilePath)) {
      try {
        dnaContext = fs.readFileSync(userFilePath, 'utf-8');
        isDnaComplete = true; 
      } catch (err) {
        console.error(`[Strategist] Failed to read user DNA file:`, err);
      }
    }

    // 2. Fetch from DB if no file (Priority 2)
    if (!dnaContext) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('dna_answers')
        .eq('id', userId)
        .single();
      
      const answers = profile?.dna_answers;
      isDnaComplete = answers && Object.keys(answers).length >= 5;
      dnaContext = formatDNA(answers);
    }

    // 3. Load Bible_SOT doctrines
    const generalScript = getBibleSOTContent('General_script.md');
    const contentLego = getBibleSOTContent('Content_lego.md');
    const brandDnaMethodology = getBibleSOTContent('Brand_DNA.md');

    return `
      ${generalScript}
      ${contentLego}

      --- BRAND DNA CONTEXT ---
      ${dnaContext}

      --- DATABASE DATA (USING .md FILES) ---
      BRAND_DNA_METHODOLOGY_REFERENCE:
      ${brandDnaMethodology}

      --- OPERATIONAL INSTRUCTIONS ---
      LANGUAGE: RESPOND EXCLUSIVELY IN ${languageName.toUpperCase()}.
      TONE: Analytical, expert, authoritative, "Sherlock" persona.

      --- MISSION: THE 5x4 CONTENT LEGO MATRIX ---
      If the user provides a TOPIC, you must generate a complete matrix of 5 DIFFERENT VIRAL STYLES.
      Each style must have exactly 4 BLOCKS as defined in Content_lego.md.

      --- ACTIVE MODE ---
      ${!isDnaComplete ? `
      MODE: BRAND DNA INTERVIEW (PRIORITY)
      User DNA is currently incomplete.
      MISSION: Conduct a professional interview to fill the DNA based on Brand_DNA.md methodology. 
      ` : `
      MODE: PRODUCTION (CONTENT LEGO)
      DNA is complete. Use the provided DNA context to calibrate all scripts!
      `}
    `;
  }
};
