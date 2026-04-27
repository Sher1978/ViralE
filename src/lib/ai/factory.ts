import * as gemini from "./gemini";
import * as anthropic from "./anthropic";
import * as groq from "./groq";

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

export async function generateScript(
  coreIdea: string, 
  digitalShadow: string, 
  options: GenerationOptions = {}
) {
  const { engine = 'groq', locale = 'en', anthropicApiKey, geminiApiKey, groqApiKey, brandDna, hook, role } = options;

  switch (engine) {
    case 'claude':
    case 'claude-byok':
      return anthropic.generateScript(coreIdea, digitalShadow, locale, anthropicApiKey, brandDna);
    case 'groq':
      return groq.generateScript(coreIdea, digitalShadow, locale, groqApiKey, brandDna);
    case 'gemini':
    default:
      return gemini.generateScript(coreIdea, digitalShadow, locale, geminiApiKey, brandDna, hook, role);
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
