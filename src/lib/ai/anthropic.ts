import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = "claude-3-5-sonnet-20240620";

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
    
    CONTENT CONSTRAINT: The TOTAL duration of a script (sum of all 5 blocks: hook, problem, good_news, solution, cta) MUST NOT EXCEED 50 SECONDS of reading time (max 150 words total).
    
    USER'S DIGITAL SHADOW: 
    ${persona}
    
    INSTRUCTIONS:
    1. Tone: Ironic, Expert, Fast-paced.
    2. Language: ${languageName}.
    3. Output MUST be valid JSON.
  `;
}

export async function generateScript(
  coreIdea: string, 
  digitalShadow: string, 
  locale: string = 'en',
  apiKey?: string
) {
  const authKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
  const anthropic = new Anthropic({ apiKey: authKey });
  
  const systemPrompt = getSystemPrompt(digitalShadow, locale);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    Based on this idea: "${coreIdea}", generate 5 distinct viral video scripts (scenarios) for different content vectors.
    
    SCENARIOS TO GENERATE:
    1. evergreen: Universal expert content, timeless value.
    2. trend: Optimized for current viral trends, high energy.
    3. educational: Direct problem-solution teaching.
    4. controversial: Challenging myths, deep irony, provocative.
    5. storytelling: Personal narrative, bond building.

    Structure for EACH scenario:
    - hook: 1-3 words impact
    - problem: the pain point
    - good_news: the positive turn
    - solution: the core value/lesson
    - cta: punchy call to action
    - visual_hook: detailed Cover image prompt
    - social_post: engaging caption
    
    REMEMBER: Output in ${languageName}. 
    Output ONLY valid JSON in format: 
    {
      "evergreen": { "hook": "...", "problem": "...", "good_news": "...", "solution": "...", "cta": "...", "visual_hook": "...", "social_post": "..." },
      "trend": { "hook": "...", "problem": "...", "good_news": "...", "solution": "...", "cta": "...", "visual_hook": "...", "social_post": "..." },
      "educational": { "hook": "...", "problem": "...", "good_news": "...", "solution": "...", "cta": "...", "visual_hook": "...", "social_post": "..." },
      "controversial": { "hook": "...", "problem": "...", "good_news": "...", "solution": "...", "cta": "...", "visual_hook": "...", "social_post": "..." },
      "storytelling": { "hook": "...", "problem": "...", "good_news": "...", "solution": "...", "cta": "...", "visual_hook": "...", "social_post": "..." }
    }
  `;

  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      { role: "user", content: userPrompt }
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error("Unexpected content type from Anthropic");
  
  const text = content.text.trim();
  
  // Clean potential markdown code blocks
  const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
  return JSON.parse(jsonStr);
}

export async function refineScript(
  currentScript: any, 
  instruction: string, 
  digitalShadow: string, 
  locale: string = 'en',
  apiKey?: string
) {
  const authKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
  const anthropic = new Anthropic({ apiKey: authKey });
  
  const systemPrompt = getSystemPrompt(digitalShadow, locale);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    EXISTING SCRIPT:
    ${JSON.stringify(currentScript, null, 2)}
    
    INSTRUCTION: "${instruction}"
    
    TASK: Refine the script based on the instruction. 
    Update these specific parts: hook, problem, good_news, solution, cta, visual_hook, social_post.
    
    CRITICAL: 
    - Maintain the user's digital shadow and style.
    - Output in ${languageName}. 
    - Output ONLY valid JSON in the same structure as the existing script.
  `;

  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: "user", content: userPrompt }
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error("Unexpected content type from Anthropic");
  
  const text = content.text.trim();
  
  const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
  return JSON.parse(jsonStr);
}
