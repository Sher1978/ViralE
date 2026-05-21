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
}

// 🧠 Dynamic TRIZ 9-Screen Matrix Generator Step
async function generateTrizMatrix(
  coreIdea: string,
  digitalShadow: string,
  locale: string,
  geminiApiKey?: string
): Promise<string> {
  try {
    const trizPath = path.join(process.cwd(), 'Bible_SOT', 'AI_prompts', 'TRIZ.md');
    if (!fs.existsSync(trizPath)) {
      console.warn('[TRIZ] Methodology file not found at:', trizPath);
      return '';
    }

    const trizTemplateText = fs.readFileSync(trizPath, 'utf-8');
    console.log('[TRIZ] Running automated Step 1: 9-Screen TRIZ Matrix Generation...');
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
      Output EXCLUSIVELY in the same language as the input theme: "${coreIdea}" (Russian or English).
      Be detailed, strategic, and professional.
    `;

    const responseText = await gemini.generateText(trizPrompt, geminiApiKey);
    console.log(`[TRIZ] Step 1 completed successfully in ${(performance.now() - tStart).toFixed(0)} ms! Size: ${responseText.length} chars`);
    return responseText;
  } catch (error: any) {
    console.error('[TRIZ] Step 1 failed, continuing script generation without TRIZ matrix context:', error.message);
    return '';
  }
}

export async function generateScript(
  coreIdea: string, 
  digitalShadow: string, 
  options: GenerationOptions = {}
) {
  const { engine = 'groq', locale = 'en', anthropicApiKey, geminiApiKey, groqApiKey, brandDna, hook, role } = options;

  // 1. Execute Step 1: Run TRIZ Marketing Matrix Analysis
  const trizMatrix = await generateTrizMatrix(coreIdea, digitalShadow, locale, geminiApiKey);

  // 2. Execute Step 2: Feed TRIZ Matrix into the scriptwriter
  switch (engine) {
    case 'claude':
    case 'claude-byok':
      return anthropic.generateScript(coreIdea, digitalShadow, locale, anthropicApiKey, brandDna, trizMatrix);
    case 'groq':
      return groq.generateScript(coreIdea, digitalShadow, locale, groqApiKey, brandDna, trizMatrix);
    case 'gemini':
    default:
      return gemini.generateScript(coreIdea, digitalShadow, locale, geminiApiKey, brandDna, hook, role, trizMatrix);
  }
}

export async function refineScript(
  currentScript: any,
  instruction: string,
  digitalShadow: string,
  options: GenerationOptions = {}
) {
  const { engine = 'groq', locale = 'en', anthropicApiKey, geminiApiKey, groqApiKey, brandDna } = options;

  switch (engine) {
    case 'claude':
    case 'claude-byok':
      return anthropic.refineScript(currentScript, instruction, digitalShadow, locale, anthropicApiKey, brandDna);
    case 'groq':
      return groq.refineScript(currentScript, instruction, digitalShadow, locale, groqApiKey, brandDna);
    case 'gemini':
    default:
      return gemini.refineScript(currentScript, instruction, digitalShadow, locale, geminiApiKey, brandDna);
  }
}
