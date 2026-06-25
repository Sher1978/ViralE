import Anthropic from "@anthropic-ai/sdk";
 
const DEFAULT_MODEL = "claude-3-5-haiku-latest";

async function createAnthropicMessage(
  anthropic: Anthropic,
  params: {
    model: string;
    max_tokens: number;
    system: string;
    messages: any[];
  }
) {
  const modelName = params.model.toLowerCase();
  const candidates = [
    modelName,
    "claude-3-5-haiku-latest",
    "claude-3-5-haiku-20241022",
    "claude-3-5-sonnet-latest",
    "claude-3-5-sonnet-20241022",
    "claude-3-haiku-20240307"
  ];
  
  const uniqueCandidates = Array.from(new Set(candidates));
  let lastError: any = null;
  
  for (const modelCandidate of uniqueCandidates) {
    try {
      console.log(`[Anthropic client] Executing query on candidate model: ${modelCandidate}`);
      return await anthropic.messages.create({
        ...params,
        model: modelCandidate
      });
    } catch (err: any) {
      lastError = err;
      const errMsg = err.message || '';
      console.warn(`[Anthropic client] Model ${modelCandidate} failed: ${errMsg}. Trying next candidate...`);
      if (err.status === 401 || errMsg.includes('API key') || errMsg.includes('invalid_api_key')) {
        break;
      }
    }
  }
  
  throw lastError || new Error("Anthropic generation failed on all fallback candidates.");
}

export async function generateTrizText(prompt: string, apiKey?: string): Promise<string> {
  const authKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
  if (!authKey) throw new Error("Anthropic API key not configured");
  
  const anthropic = new Anthropic({ apiKey: authKey });
  const modelName = (process.env.ANTHROPIC_MODEL || DEFAULT_MODEL).toLowerCase();
  
  const response = await createAnthropicMessage(anthropic, {
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
}


/**
 * Orchestrates the "Digital Shadow" prompt construction with locale support
 */
export function getSystemPrompt(digitalShadow: string, locale: string = 'en', brandDna?: any, systemPromptBase?: string) {
  const languageName = locale === 'ru' ? 'Russian' : 'English';
  
  const persona = digitalShadow && digitalShadow.trim() !== "" 
    ? digitalShadow 
    : (locale === 'ru' 
        ? "Вы — опытный контент-стратег и экспертный автор. Ваш стиль: глубокий разбор темы, ироничный взгляд на индустрию."
        : "You are a seasoned content strategist and expert author.");

  const industry = brandDna?.industry || "Marketing & Content Production";
  const knowledgeBase = brandDna?.knowledgeBase ? JSON.stringify(brandDna.knowledgeBase) : "Standard viral patterns";

  if (systemPromptBase && systemPromptBase.trim() !== "") {
    return `
      ${systemPromptBase}

      USER BRAND DNA & CONTEXT:
      - Industry: ${industry}
      - Brand/User DNA: ${persona}
      - Deep Knowledge Base: ${knowledgeBase}
      
      CRITICAL: Output must be valid JSON in the exact structure requested by the user prompt.
    `;
  }

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
  trizMatrix?: string,
  systemPromptBase?: string
) {
  const authKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
  const anthropic = new Anthropic({ apiKey: authKey });
  
  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    Based on this idea: "${coreIdea}", generate 5 distinct viral video scripts (scenarios) based on the CONTENT LEGO methodology.
    
    ${trizMatrix ? `
    --- STRATEGIC TRIZ 9-SCREEN MATRIX BLUEPRINT ---
    Use the following marketing analysis to enrich your scenarios, hooks, context and details. Align each scenario style with a relevant screen from this TRIZ matrix (e.g. Evergreen with System/Present, Trend with Supersystem/Future, Storytelling with System/Past):
    ${trizMatrix}
    ` : ""}
    
    CRITICAL LANGUAGE RULES:
    1. Respond EXCLUSIVELY in the active language: ${languageName.toUpperCase()}.
    2. All generated content, scenarios, hooks, context, meat, cta, broll descriptions, and social posts MUST be strictly in ${languageName.toUpperCase()}!
    
    CRITICAL: Each block (1-4) MUST contain FULL, READY-TO-SPEAK TEXT. No placeholders. No "abstract theses". No descriptions of what to say. ONLY the final words the actor will dictate.
    
    1. hook: Triple Hook (0-5s). Visual description + On-screen text (3-5 words) + Spoken words. Ends with a Curiosity Loop.
    2. body: Context & Agitation (15-20s dictation). ENTRY PHRASE: "The thing is..." or "Notice this..." or "Let me explain...". Focus on "Thought Narration".
    3. triz_inversion: Re-Hook & Meat (15-20s dictation). ENTRY PHRASE (Must be a contrast word): "BUT..." or "However..." or "The truth is...". RHYTHM: Staccato.
    4. cta: Native CTA (15-20s dictation). ENTRY PHRASE: "That's why..." or "So if you want...". Call to leave a KEYWORD in comments.

    STYLES to generate for the idea:
    1. controversial (The Contrarian): Attacking popular myths.
    2. edutainment (Shadow Investigator): Turning viewer weaknesses into superpowers.
    3. evergreen (Case Study): Desire-based breakdown of results.
    4. trends (The Listicle): Dynamic value list (weakest to strongest).
    5. storytelling (Vulnerable Story): Trust-building through past failure.

    Structure for EACH scenario (style):
    - style_name: controversial | edutainment | evergreen | trends | storytelling
    - hook: { visual: "...", screen_text: "...", words: "..." }
    - body: { words: "..." }
    - triz_inversion: { words: "..." }
    - cta: { words: "..." }
    - broll_prompt: Final action-semantic description for a 5s B-roll using Visual_Script_Generator metaphors.
    - visual_hook: Detailed cinematic prompt for Midjourney cover (following Visual_Script_Generator logic).

    - social_post: Caption with 3 emojis + 3 tags.

    Output ONLY valid JSON in format: 
    {
      "controversial": { ... },
      "edutainment": { ... },
      "evergreen": { ... },
      "trends": { ... },
      "storytelling": { ... }
    }
  `;

  const modelName = (process.env.ANTHROPIC_MODEL || DEFAULT_MODEL).toLowerCase();
  const response = await createAnthropicMessage(anthropic, {
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
}

export async function refineScript(
  currentScript: any, 
  instruction: string, 
  digitalShadow: string, 
  locale: string = 'en',
  apiKey?: string,
  brandDna?: any,
  systemPromptBase?: string
) {
  const authKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
  const anthropic = new Anthropic({ apiKey: authKey });
  
  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);
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
  const response = await createAnthropicMessage(anthropic, {
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
}
