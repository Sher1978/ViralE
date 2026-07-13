import * as gemini from "./gemini";
import * as anthropic from "./anthropic";
import * as groq from "./groq";
import fs from 'fs';
import path from 'path';

export type AIEngine = 'gemini' | 'claude' | 'claude-byok' | 'groq';

export interface GenerationOptions {
  engine?: AIEngine;
  locale?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
  groqApiKey?: string;
  brandDna?: {
    knowledgeBase?: any;
    industry?: string;
  };
  hook?: string;
  role?: string;
  systemPromptBase?: string;
}

// 🧠 Dynamic TRIZ 9-Screen Matrix Generator Step
async function generateTrizMatrix(
  coreIdea: string,
  digitalShadow: string,
  locale: string,
  geminiApiKey?: string,
  anthropicApiKey?: string,
  groqApiKey?: string
): Promise<string> {
  const languageName = locale === 'ru' ? 'Russian' : 'English';
  try {
    const trizPath = path.join(process.cwd(), 'Bible_SOT', 'AI_prompts', 'TRIZ.md');
    if (!fs.existsSync(trizPath)) {
      console.warn('[TRIZ] Methodology file not found at:', trizPath);
      return '';
    }
 
    const trizTemplateText = fs.readFileSync(trizPath, 'utf-8');
    const tStart = performance.now();
 
    const trizPrompt = `
      You are an expert neuromarketer and creative strategist.
      Based on the user's Brand DNA/Digital Shadow, run the TRIZ analysis prompt using the following inputs.
      
      --- USER BRAND DNA / STRATEGIC CONTEXT ---
      ${digitalShadow}
      
      --- TRIZ METHODOLOGY & TEMPLATE ---
      ${trizTemplateText}
      
      --- INPUTS ---
      * Object (Theme): ${coreIdea}
      
      TASK: Generate a high-fidelity marketing matrix of 9 ideas following the TRIZ screens methodology. 
      Output EXCLUSIVELY in ${languageName}. Translate the input theme and Brand DNA context on the fly to ${languageName} if necessary.
      Be detailed, strategic, and professional.
    `;
 
    // 1. Try Gemini first (if key is set)
    if (geminiApiKey && geminiApiKey.trim() !== '') {
      try {
        console.log('[TRIZ] Running automated Step 1 using Gemini...');
        const responseText = await gemini.generateText(trizPrompt, geminiApiKey);
        console.log(`[TRIZ] Gemini completed successfully in ${(performance.now() - tStart).toFixed(0)} ms!`);
        return responseText;
      } catch (geminiErr: any) {
        console.warn('[TRIZ] Gemini failed, attempting fallback...', geminiErr.message);
      }
    }

    // 2. Fallback to Groq
    if (groqApiKey || process.env.GROQ_API_KEY) {
      try {
        console.log('[TRIZ] Running automated Step 1 using Groq fallback...');
        const responseText = await groq.generateTrizText(trizPrompt, groqApiKey);
        console.log(`[TRIZ] Groq fallback completed successfully in ${(performance.now() - tStart).toFixed(0)} ms!`);
        return responseText;
      } catch (groqErr: any) {
        console.warn('[TRIZ] Groq fallback failed...', groqErr.message);
      }
    }

    // 3. Fallback to Claude (Anthropic)
    if (anthropicApiKey || process.env.ANTHROPIC_API_KEY) {
      try {
        console.log('[TRIZ] Running automated Step 1 using Claude fallback...');
        const responseText = await anthropic.generateTrizText(trizPrompt, anthropicApiKey);
        console.log(`[TRIZ] Claude fallback completed successfully in ${(performance.now() - tStart).toFixed(0)} ms!`);
        return responseText;
      } catch (anthropicErr: any) {
        console.warn('[TRIZ] Claude fallback failed...', anthropicErr.message);
      }
    }
 
    console.warn('[TRIZ] All fallback engines failed or unconfigured, running script writing without TRIZ.');
    return '';
  } catch (error: any) {
    console.error('[TRIZ] Step 1 critical failure:', error.message);
    return '';
  }
}
 
export async function generateScript(
  coreIdea: string, 
  digitalShadow: string, 
  options: GenerationOptions = {}
) {
  const { engine = 'groq', locale = 'en', anthropicApiKey, geminiApiKey, groqApiKey, brandDna, hook, role } = options;
  
  let systemPromptBase = options.systemPromptBase;
  if (!systemPromptBase) {
    try {
      const promptPath = path.join(process.cwd(), 'Bible_SOT', 'AI_prompts', 'General_script.md');
      if (fs.existsSync(promptPath)) {
        systemPromptBase = fs.readFileSync(promptPath, 'utf-8');
      }
    } catch (err) {
      console.warn('[Factory] Failed to read General_script.md', err);
    }
  }
 
  // TRIZ step is now handled interactively in the frontend via /api/script/triz
  const trizMatrix = '';
 
  // 2. Execute Step 2: Feed into the scriptwriter
  switch (engine) {
    case 'claude':
    case 'claude-byok':
      return anthropic.generateScript(coreIdea, digitalShadow, locale, anthropicApiKey, brandDna, trizMatrix, systemPromptBase);
    case 'groq':
      return groq.generateScript(coreIdea, digitalShadow, locale, groqApiKey, brandDna, trizMatrix, systemPromptBase);
    case 'gemini':
    default:
      return gemini.generateScript(coreIdea, digitalShadow, locale, geminiApiKey, brandDna, hook, role, trizMatrix, systemPromptBase);
  }
}

export async function refineScript(
  currentScript: any,
  instruction: string,
  digitalShadow: string,
  options: GenerationOptions = {}
) {
  const { engine = 'groq', locale = 'en', anthropicApiKey, geminiApiKey, groqApiKey, brandDna } = options;

  let systemPromptBase = options.systemPromptBase;
  if (!systemPromptBase) {
    try {
      const promptPath = path.join(process.cwd(), 'Bible_SOT', 'AI_prompts', 'General_script.md');
      if (fs.existsSync(promptPath)) {
        systemPromptBase = fs.readFileSync(promptPath, 'utf-8');
      }
    } catch (err) {
      console.warn('[Factory] Failed to read General_script.md', err);
    }
  }

  switch (engine) {
    case 'claude':
    case 'claude-byok':
      return anthropic.refineScript(currentScript, instruction, digitalShadow, locale, anthropicApiKey, brandDna, systemPromptBase);
    case 'groq':
      return groq.refineScript(currentScript, instruction, digitalShadow, locale, groqApiKey, brandDna, systemPromptBase);
    case 'gemini':
    default:
      return gemini.refineScript(currentScript, instruction, digitalShadow, locale, geminiApiKey, brandDna, systemPromptBase);
  }
}

export async function generatePreviews(
  coreIdea: string,
  digitalShadow: string,
  options: GenerationOptions = {}
) {
  const { engine = 'groq', locale = 'en', anthropicApiKey, geminiApiKey, groqApiKey, brandDna } = options;
  let systemPromptBase = options.systemPromptBase;
  if (!systemPromptBase) {
    try {
      const promptPath = path.join(process.cwd(), 'Bible_SOT', 'AI_prompts', 'General_script.md');
      if (fs.existsSync(promptPath)) {
        systemPromptBase = fs.readFileSync(promptPath, 'utf-8');
      }
    } catch (err) {
      console.warn('[Factory] Failed to read General_script.md', err);
    }
  }

  switch (engine) {
    case 'claude':
    case 'claude-byok':
      return anthropic.generatePreviews(coreIdea, digitalShadow, locale, anthropicApiKey, brandDna, systemPromptBase);
    case 'groq':
      return groq.generatePreviews(coreIdea, digitalShadow, locale, groqApiKey, brandDna, systemPromptBase);
    case 'gemini':
    default:
      return gemini.generatePreviews(coreIdea, digitalShadow, locale, geminiApiKey, brandDna, systemPromptBase);
  }
}

export async function generateFullScript(
  coreIdea: string,
  selectedStyle: string,
  selectedPreview: any,
  digitalShadow: string,
  options: GenerationOptions = {}
) {
  const { engine = 'groq', locale = 'en', anthropicApiKey, geminiApiKey, groqApiKey, brandDna } = options;
  let systemPromptBase = options.systemPromptBase;
  if (!systemPromptBase) {
    try {
      const promptPath = path.join(process.cwd(), 'Bible_SOT', 'AI_prompts', 'General_script.md');
      if (fs.existsSync(promptPath)) {
        systemPromptBase = fs.readFileSync(promptPath, 'utf-8');
      }
    } catch (err) {
      console.warn('[Factory] Failed to read General_script.md', err);
    }
  }

  switch (engine) {
    case 'claude':
    case 'claude-byok':
      return anthropic.generateFullScript(coreIdea, selectedStyle, selectedPreview, digitalShadow, locale, anthropicApiKey, brandDna, systemPromptBase);
    case 'groq':
      return groq.generateFullScript(coreIdea, selectedStyle, selectedPreview, digitalShadow, locale, groqApiKey, brandDna, systemPromptBase);
    case 'gemini':
    default:
      return gemini.generateFullScript(coreIdea, selectedStyle, selectedPreview, digitalShadow, locale, geminiApiKey, brandDna, systemPromptBase);
  }
}
