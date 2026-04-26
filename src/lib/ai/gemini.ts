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

  const knowledgeBase = brandDna?.knowledgeBase ? JSON.stringify(brandDna.knowledgeBase, null, 2) : "None provided.";
  const industry = brandDna?.industry || "General Content Creation";

  return `
    You are the "Viral Engine" Strategist. You operate at the intersection of two dynamic databases:
    1. BRAND DNA: Defines "WHO is speaking" and "TO WHOM". (Extracted from User Profile)
    2. CONTENT LEGO: Defines "HOW virality is technically built today" using modular building blocks.
    
    SYSTEM CONTEXT:
    - Industry: ${industry}
    - Brand/User DNA: ${persona}
    - Deep Knowledge Base: ${knowledgeBase}
    
    METHODOLOGY (CONTENT LEGO):
    - Each video is a combination of independent building blocks.
    - Focus on "Show what is being said" (Action-Semantic Continuity).
    - Every B-Roll prompt must extract the KEY ACTION or KEY SUBJECT from the spoken text.
    - Format B-Roll prompts: "[subject] [doing the exact action from the text], [camera style], [mood]".
    
    CRITICAL CONSTRAINTS:
    - The TOTAL duration of a script (5 acts) MUST NOT EXCEED 50 SECONDS of reading time (approx 130-150 words).
    - Detect and use the INPUT LANGUAGE for all generation.
    - Output MUST be valid JSON.
    - Tone: Ironic, Expert, Fast-paced (iOS 26 Style).
  `;
}

export async function generateScript(coreIdea: string, digitalShadow: string, locale: string = 'en', apiKey?: string, brandDna?: any) {
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
    Based on this idea: "${coreIdea}", generate 5 distinct viral video scripts (scenarios) for different content vectors.
    
    SCENARIOS TO GENERATE:
    1. evergreen: Universal expert content that stays relevant. Focus on timeless value. Tone: Stable, Professional.
    2. trend: High-energy, fast-paced, optimized for current social media trends. Focus on peak attention. Tone: Dynamic, Bold.
    3. educational: Direct problem-solution format. Focus on teaching one specific thing clearly. Tone: Clarity, Expert.
    4. controversial: Polarizing viewpoint, deep irony, or challenging common myths. Focus on high comments and shares. Tone: Provocative, Sharp.
    5. storytelling: Personal narrative, building a bond with the audience through a story or analogy. Tone: Authentic, Relatable.

    Structure for EACH scenario:
    - hook: Strong opening (The Text Hook, 1-3 words)
    - problem: The pain point, mystery, or conflict (3-5 seconds)
    - good_news: The positive turn, revelation, or twist
    - solution: The core value, answer, or lesson
    - cta: Punchy, high-conversion call to action
    - visual_hook: A highly detailed, cinematic prompt for an AI image generator (like Midjourney) to create a viral COVER for this video. Use professional photography terms.
    - broll_prompt: A direct action-semantic description for a 5-second B-roll. SHOW THE KEY ACTION.
    - social_post: A short, engaging social media description/caption with 3 relevant emojis and 3 tags.
    
    Output ONLY valid JSON in format: 
    {
      "evergreen": { "hook": "...", "problem": "...", "good_news": "...", "solution": "...", "cta": "...", "visual_hook": "...", "broll_prompt": "...", "social_post": "..." },
      ... (other 4 scenarios)
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
    
    The resulting DNA description MUST be in ${languageName}.
    
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
