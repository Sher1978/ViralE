
import { getSystemPrompt } from "./anthropic"; // Reuse the prompt logic

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export async function generateScript(
  coreIdea: string, 
  digitalShadow: string, 
  locale: string = 'en',
  apiKey?: string,
  brandDna?: any
) {
  const authKey = apiKey || process.env.GROQ_API_KEY || "";
  if (!authKey) throw new Error("Groq API key not configured");

  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    Based on this idea: "${coreIdea}", generate 5 distinct viral video scripts (scenarios) based on the CONTENT LEGO methodology.
    
    CRITICAL: ALL text content in these scripts MUST be in ${languageName.toUpperCase()}. 
    Do not use English if the language requested is ${languageName}.
    
    LENGTH: Each script segment should be detailed (at least 3-4 sentences for context and meat).

    SCENARIOS TO GENERATE:
    1. evergreen: Universal expert content, attacking myths.
    2. trend: High-energy, optimized for current trends.
    3. educational: Direct problem-solution teaching.
    4. controversial: Challenging myths, provocative listicle.
    5. storytelling: Personal narrative, trust building.

    Structure for EACH scenario:
    - hook: { "visual": "...", "screen_text": "...", "words": "..." }
    - context: { "words": "..." }
    - meat: { "words": "..." }
    - cta: { "words": "..." }
    - broll_prompt: 5-word cinematic description for B-roll.
    - visual_hook: Detailed prompt for Midjourney cover.
    - social_post: Short engaging caption with emojis.
    
    REMEMBER: All text output must be in ${languageName}. 
    Output ONLY valid JSON in format: 
    {
      "evergreen": { "hook": { "visual": "...", "screen_text": "...", "words": "..." }, "context": { "words": "..." }, "meat": { "words": "..." }, "cta": { "words": "..." }, "broll_prompt": "...", "visual_hook": "...", "social_post": "..." },
      "trend": { ... },
      "educational": { ... },
      "controversial": { ... },
      "storytelling": { ... }
    }
  `;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${authKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Groq generation failed");
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}

export async function refineScript(
  currentScript: any, 
  instruction: string, 
  digitalShadow: string, 
  locale: string = 'en',
  apiKey?: string,
  brandDna?: any
) {
  const authKey = apiKey || process.env.GROQ_API_KEY || "";
  if (!authKey) throw new Error("Groq API key not configured");

  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    EXISTING SCRIPT:
    ${JSON.stringify(currentScript, null, 2)}
    
    INSTRUCTION: "${instruction}"
    
    TASK: Refine the script based on the instruction. 
    You can update any of these parts:
    - hook (text hook)
    - intro
    - story (body)
    - cta
    - visual_hook (cover image prompt)
    - social_post (caption)
    
    CRITICAL: 
    - Maintain the user's digital shadow and style.
    - Output in ${languageName}. 
    - Output ONLY valid JSON in the same structure as the existing script.
  `;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${authKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Groq refinement failed");
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}
