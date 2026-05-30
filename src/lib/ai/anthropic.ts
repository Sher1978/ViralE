import Anthropic from "@anthropic-ai/sdk";
 
const DEFAULT_MODEL = "claude-3-5-haiku-20241022";

export async function generateTrizText(prompt: string, apiKey?: string): Promise<string> {
  const authKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
  if (!authKey) throw new Error("Anthropic API key not configured");
  
  const anthropic = new Anthropic({ apiKey: authKey });
  const modelName = (process.env.ANTHROPIC_MODEL || DEFAULT_MODEL).toLowerCase();
  
  try {
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 1024,
      system: "You are a professional neuromarketer and creative strategist.",
      messages: [
        { role: "user", content: prompt }
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error("Unexpected content type from Anthropic");
    return content.text;
  } catch (error: any) {
    // If the account doesn't have access to Claude 3.5 Haiku, fallback to Claude 3 Haiku
    if ((error.status === 404 || error.message?.includes("model") || error.message?.includes("not_found")) && modelName === "claude-3-5-haiku-20241022") {
      console.warn(`[Anthropic] Model ${modelName} not found or accessible. Falling back to claude-3-haiku-20240307...`);
      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        system: "You are a professional neuromarketer and creative strategist.",
        messages: [
          { role: "user", content: prompt }
        ],
      });
      const content = response.content[0];
      if (content.type !== 'text') throw new Error("Unexpected content type from Anthropic");
      return content.text;
    }
    throw error;
  }
}


/**
 * Orchestrates the "Digital Shadow" prompt construction with locale support
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
    - VISUAL PROMPT LOGIC (Visual_Script_Generator): 
      - Analyze user DNA (e.g., auto-blogger, business coach).
      - Semantic Analysis: [DNA Context] + [Phrase Meaning] = [Visual Metaphor].
      - Structure: (Global Style Anchor), (Action/Object representing metaphor), (Environment), (Mood), --no fantasy, noir, cartoon.
    - TOTAL duration: ~60-80 SECONDS total (approx. 180-220 words total).
    - CRITICAL: Generate content STRICTLY in ${languageName}! Even if the provided topic, idea, or Brand DNA is in a different language, you MUST translate it on the fly and output the final scripts, hooks, solutions, and social posts exclusively in ${languageName}.
    - Output MUST be valid JSON.
  `;
}

export async function generateScript(
  coreIdea: string, 
  digitalShadow: string, 
  locale: string = 'en',
  apiKey?: string,
  brandDna?: any,
  trizMatrix?: string
) {
  const authKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
  const anthropic = new Anthropic({ apiKey: authKey });
  
  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    Based on this idea: "${coreIdea}", generate 5 distinct viral video scripts (scenarios) for different content vectors.
    
    ${trizMatrix ? `
    --- STRATEGIC TRIZ 9-SCREEN MATRIX BLUEPRINT ---
    Use the following marketing analysis to enrich your scenarios, hooks, context and details. Align each scenario style with a relevant screen from this TRIZ matrix (e.g. Evergreen with System/Present, Trend with Supersystem/Future, Storytelling with System/Past):
    ${trizMatrix}
    ` : ""}
    
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

  const modelName = (process.env.ANTHROPIC_MODEL || DEFAULT_MODEL).toLowerCase();
  try {
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 2048,
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
  } catch (error: any) {
    if ((error.status === 404 || error.message?.includes("model") || error.message?.includes("not_found")) && modelName === "claude-3-5-haiku-20241022") {
      console.warn(`[Anthropic] Model ${modelName} not found or accessible in generateScript. Falling back to claude-3-haiku-20240307...`);
      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 2048,
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
    throw error;
  }
}

export async function refineScript(
  currentScript: any, 
  instruction: string, 
  digitalShadow: string, 
  locale: string = 'en',
  apiKey?: string,
  brandDna?: any
) {
  const authKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
  const anthropic = new Anthropic({ apiKey: authKey });
  
  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna);
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

  const modelName = (process.env.ANTHROPIC_MODEL || DEFAULT_MODEL).toLowerCase();
  try {
    const response = await anthropic.messages.create({
      model: modelName,
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
  } catch (error: any) {
    if ((error.status === 404 || error.message?.includes("model") || error.message?.includes("not_found")) && modelName === "claude-3-5-haiku-20241022") {
      console.warn(`[Anthropic] Model ${modelName} not found or accessible in refineScript. Falling back to claude-3-haiku-20240307...`);
      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
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
    throw error;
  }
}
