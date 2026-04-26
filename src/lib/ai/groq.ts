
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
    Based on this idea: "${coreIdea}", generate 3 distinct viral video scripts (scenarios).
    
    SCENARIOS TO GENERATE:
    1. evergreen: Universal expert content that stays relevant. Focus on timeless value.
    2. trend: High-energy, fast-paced, optimized for 2026 trends. Focus on peak attention.
    3. educational: Direct problem-solution format. Focus on teaching one specific thing.

    Structure for EACH scenario:
    - hook: 1-3 words, high impact (The Text Hook)
    - intro: first 3 seconds
    - story: the "meat" of the content
    - cta: single sentence call to action
    - visual_hook: A highly detailed, cinematic prompt for an AI image generator (like Midjourney) to create a viral COVER for this video. Use professional photography terms.
    - social_post: A short, engaging social media description/caption with 3 relevant emojis and 3 tags.
    
    REMEMBER: All text output must be in ${languageName}. 
    Output ONLY valid JSON in format: 
    {
      "evergreen": { "hook": "...", "intro": "...", "story": "...", "cta": "...", "visual_hook": "...", "social_post": "..." },
      "trend": { "hook": "...", "intro": "...", "story": "...", "cta": "...", "visual_hook": "...", "social_post": "..." },
      "educational": { "hook": "...", "intro": "...", "story": "...", "cta": "...", "visual_hook": "...", "social_post": "..." }
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
