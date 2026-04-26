import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const DEFAULT_MODEL = "gemini-1.5-flash";

export const model = genAI.getGenerativeModel({ 
  model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
  generationConfig: {
    responseMimeType: "application/json",
  }
});

/**
 * Orchestrates the "Digital Shadow" prompt construction with Brand DNA and Content Lego support
 */
export function getSystemPrompt(digitalShadow: string, locale: string = 'en', brandDna?: any) {
  const languageName = locale === 'ru' ? 'Russian' : 'English';
  
  const persona = digitalShadow && digitalShadow.trim() !== "" 
    ? digitalShadow 
    : (locale === 'ru' 
        ? "Вы — опытный контент-стратег и экспертный автор. Ваш стиль: глубокий разбор темы, ироничный взгляд на индустрию."
        : "You are a seasoned content strategist and expert author.");

  const industry = brandDna?.industry || "Marketing & Content Production";
  const knowledgeBase = brandDna?.knowledgeBase ? JSON.stringify(brandDna.knowledgeBase) : "Standard viral patterns";

  return `
    You are an ELITE AI STRATEGIST, NEUROMARKETER, AND VIRAL CONTENT SCRIPTWRITER. 
    Your mission: Generate high-conversion scripts, posts, and ideas that break banner blindness and turn viewers into loyal clients.
    
    SYSTEM CONTEXT:
    - Industry: ${industry}
    - Brand/User DNA: ${persona}
    - Deep Knowledge Base: ${knowledgeBase}
    
    CONTENT GENERATION ALGORITHM (5 STEPS):
    STEP 1: Sense Calibration (Brand DNA) - Analyze Tone of Voice and role model. Choose one specific pain point or false belief of the Target Avatar.
    STEP 2: Viral Packaging Choice (Content Lego) - Analyze script formulas. Select the structure that best reveals the chosen pain (e.g., Contradiction, Case Study, Breakdown, List).
    STEP 3: Hook Engineering (Attention Capture) - Create a synchronized hook (Visual + Screen Text + Voice). Must contain strong contrast and curiosity loops.
    STEP 4: Body Scripting (Retention) - Write in "Staccato" rhythm (short punchy phrases). Use re-hooks every 20-30 seconds. Apply "Useful Find Wrapper" (paradoxically positive assessment of weaknesses).
    STEP 5: Call to Action (CTA) - Use lead-magnet protocols. Integrate natively at the end.
    
    CORE RULES:
    - NEVER use generic greetings or clichéd phrases. Start directly with the essence.
    - Focus on "Show what is being said" (Action-Semantic B-Roll prompts).
    - TOTAL duration MUST NOT EXCEED 50 SECONDS (130-150 words).
    - CRITICAL: Generate content ONLY in the SAME LANGUAGE as the provided topic or idea. If input is Russian, output Russian. If input is Ukrainian, output Ukrainian. 
    - Output MUST be valid JSON.
  `;
}

export async function generateScript(coreIdea: string, digitalShadow: string, locale: string = 'en', apiKey?: string, brandDna?: any, hook?: string, role?: string) {
  const client = apiKey ? new GoogleGenerativeAI(apiKey) : genAI;
  const targetModel = apiKey 
    ? client.getGenerativeModel({ 
        model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
        generationConfig: { responseMimeType: "application/json" }
      }) 
    : model;

  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    Based on this idea: "${coreIdea}", generate 5 distinct viral video scripts (scenarios) based on the CONTENT LEGO methodology.
    
    CRITICAL: ALL text content in these scripts MUST be in the SAME LANGUAGE as the input idea: "${coreIdea}". If the idea/topic is in Ukrainian, every word of the script must be in Ukrainian. If Russian, then Russian.
    
    ${hook ? `CRITICAL: Every scenario MUST use this specific starting HOOK: "${hook}"` : ""}
    ${role ? `CRITICAL: Every scenario MUST be written in the ROLE/STANCE of: "${role}"` : ""}
    
    CRITICAL: Each script MUST consist of 4 independent blocks with UNIVERSAL CONNECTORS to allow interchangeability.
    
    1. BLOCK 1: Triple Hook (0-5s). Visual description + On-screen text (3-5 words) + Spoken words. Ends with a Curiosity Loop.
    2. BLOCK 2: Context & Agitation (5-15s). ENTRY PHRASE: "The thing is..." or "Notice this..." or "Let me explain...". Focus on "Thought Narration".
    3. BLOCK 3: Re-Hook & Meat (15-45s). ENTRY PHRASE (Must be a contrast word): "BUT..." or "However..." or "The truth is...". RHYTHM: Staccato.
    4. BLOCK 4: Native CTA (45-60s). ENTRY PHRASE: "That's why..." or "So if you want...". Call to leave a KEYWORD in comments.

    STYLES to generate for the idea:
    1. evergreen (Contrarian): Attacking popular myths.
    2. trend (Shadow Investigator): Turning viewer weaknesses into superpowers.
    3. educational (Case Study): Desire-based breakdown of results.
    4. controversial (The Listicle): Dynamic value list (weakest to strongest).
    5. storytelling (Vulnerable Story): Trust-building through past failure.

    Structure for EACH scenario (style):
    - style_name: evergreen | trend | educational | controversial | storytelling
    - block1: { visual: "...", screen_text: "...", words: "..." }
    - block2: { words: "..." }
    - block3: { words: "..." }
    - block4: { words: "..." }
    - broll_prompt: Final action-semantic description for a 5s B-roll.
    - visual_hook: Detailed cinematic prompt for Midjourney cover.
    - social_post: Caption with 3 emojis + 3 tags.

    Output ONLY valid JSON in format: 
    {
      "evergreen": { ... },
      "trend": { ... },
      "educational": { ... },
      "controversial": { ... },
      "storytelling": { ... }
    }
  `;

  const result = await targetModel.generateContent([systemPrompt, userPrompt]);
  const response = await result.response;
  const text = response.text().trim();
  
  const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
  return JSON.parse(jsonStr);
}

export async function synthesizeDigitalShadow(rawInputs: any, locale: string = 'en') {
  const languageName = locale === 'ru' ? 'Russian' : 'English';
  
  const prompt = `
    You are an AI Persona Architect. Based on the onboarding data below, 
    generate a high-density "Digital Shadow DNA" (Master Prompt).
    
    CRITICAL: The resulting DNA description MUST be in the SAME LANGUAGE as the onboarding data provided.
    
    ONBOARDING DATA:
    ${JSON.stringify(rawInputs, null, 2)}
    
    GOAL: Create a personality profile that includes:
    1. Tone of voice (expert, ironic, minimalist, etc.)
    2. Area of expertise
    3. Core values and worldview
    4. Target audience resonance
    
    Output ONLY a clean, declarative paragraph that will serve as the system prompt for this user.
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

/**
 * Distills raw synthetic data into a structured knowledge summary
 */
export async function distillSyntheticKnowledge(rawData: string, locale: string = 'en') {
  const languageName = locale === 'ru' ? 'Russian' : 'English';
  const prompt = `
    You are an AI Librarian. You are given raw notes/data from NotebookLM or Gemini.
    Your goal is to distill this data into a set of 5-10 key "Knowledge Fragments" 
    that define the user's expertise and style.
    
    CRITICAL: Output in the same language as the raw data. Output as a bulleted list.
    
    RAW DATA:
    ${rawData}
  `;

  const textModelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const textModel = genAI.getGenerativeModel({ model: textModelName });
  const result = await textModel.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

/**
 * Updates an existing DNA by synthesizing it with new data
 */
export async function updateDnaPersona(oldPersona: string, newData: string, locale: string = 'en') {
  const languageName = locale === 'ru' ? 'Russian' : 'English';
  
  const prompt = `
    You are an AI Persona Architect. You need to update an existing "Digital Shadow DNA" (Persona) 
    by integrating new information/examples provided by the user.
    
    CRITICAL: 
    - The resulting DNA description MUST BE IN THE SAME LANGUAGE as the source text.
    - Do not just append the new text. Synthesize it into a cohesive, consistent personality profile.
    - Ensure the final text is concise and powerful (max 400 words).
    
    EXISTING DNA:
    ${oldPersona}
    
    NEW UPDATES/EXAMPLES:
    ${newData}
    
    GOAL: Refine the tone, area of expertise, and worldview based on this new input.
    Output ONLY a clean, declarative paragraph.
  `;

  // Note: For this one we don't need JSON response, just text
  const textModelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const textModel = genAI.getGenerativeModel({ model: textModelName });
  const result = await textModel.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}
/**
 * Refines an existing script based on user instructions
 */
export async function refineScript(
  currentScript: any, 
  instruction: string, 
  digitalShadow: string, 
  locale: string = 'en',
  apiKey?: string,
  brandDna?: any
) {
  const client = apiKey ? new GoogleGenerativeAI(apiKey) : genAI;
  const targetModel = apiKey 
    ? client.getGenerativeModel({ 
        model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
        generationConfig: { responseMimeType: "application/json" }
      }) 
    : model;

  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna);

  const userPrompt = `
    EXISTING SCRIPT:
    ${JSON.stringify(currentScript, null, 2)}
    
    INSTRUCTION: "${instruction}"
    
    TASK: Refine the script based on the instruction. 
    Maintain Content Lego methodology and Brand DNA style.
    Output ONLY valid JSON in the same structure.
  `;

  const result = await targetModel.generateContent([systemPrompt, userPrompt]);
  const response = await result.response;
  const text = response.text().trim();
  
  const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
  return JSON.parse(jsonStr);
}
