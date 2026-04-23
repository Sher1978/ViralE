import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const DEFAULT_MODEL = "gemini-2.5-flash";

export const model = genAI.getGenerativeModel({ 
  model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
  generationConfig: {
    responseMimeType: "application/json",
  }
});

/**
 * Orchestrates the "Digital Shadow" prompt construction with locale support
 */
export function getSystemPrompt(digitalShadow: string, locale: string = 'en') {
  const languageName = locale === 'ru' ? 'Russian' : 'English';
  
  const persona = digitalShadow && digitalShadow.trim() !== "" 
    ? digitalShadow 
    : (locale === 'ru' 
        ? "Вы — опытный контент-стратег и экспертный автор. Ваш стиль: глубокий разбор темы, ироничный взгляд на индустрию, акцент на системность и результат. Вы говорите коротко, емко и по делу."
        : "You are a seasoned content strategist and expert author. Your style is a deep dive into the topic, an ironic look at the industry, with an focus on systems and results. You speak concisely, powerfully, and to the point.");

  return `
    You are the "Viral Engine" Strategist. Your goal is to generate high-retention video scripts 
    that stay true to the user's digital persona (The Digital Shadow).
    
    CRITICAL: All generated text content (hooks, body, calls-to-action) MUST BE IN ${languageName.toUpperCase()}.
    
    USER'S DIGITAL SHADOW: 
    ${persona}
    
    INSTRUCTIONS:
    1. Output MUST be valid JSON.
    2. Tone: Ironic, Expert, Fast-paced (iOS 26 Style).
    3. Language: ${languageName}.
  `;
}

export async function generateScript(coreIdea: string, digitalShadow: string, locale: string = 'en') {
  const systemPrompt = getSystemPrompt(digitalShadow, locale);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    Based on this idea: "${coreIdea}", generate a viral video script.
    
    Structure:
    - hook: 1-3 words, high impact
    - intro: first 3 seconds
    - body: the "meat" of the content
    - cta: single sentence call to action
    
    REMEMBER: Output in ${languageName}. Output ONLY valid JSON.
  `;

  const result = await model.generateContent([systemPrompt, userPrompt]);
  const response = await result.response;
  const text = response.text().trim();
  
  // Clean potential markdown code blocks
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
    
    CRITICAL: Output in ${languageName}. Output as a bulleted list.
    
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
    - The resulting DNA description MUST be in ${languageName}.
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
  locale: string = 'en'
) {
  const systemPrompt = getSystemPrompt(digitalShadow, locale);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    EXISTING SCRIPT:
    ${JSON.stringify(currentScript, null, 2)}
    
    INSTRUCTION: "${instruction}"
    
    TASK: Refine the script based on the instruction. 
    You can update one or all parts (hook, intro, body, cta).
    
    CRITICAL: 
    - Maintain the user's digital shadow and style.
    - Output in ${languageName}. 
    - Output ONLY valid JSON in the same structure as the existing script.
  `;

  const result = await model.generateContent([systemPrompt, userPrompt]);
  const response = await result.response;
  const text = response.text().trim();
  
  const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
  return JSON.parse(jsonStr);
}
