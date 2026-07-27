import Anthropic from "@anthropic-ai/sdk";
 
const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";

export function getAnthropicClient(apiKey?: string): Anthropic {
  const authKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
  if (!authKey) throw new Error("Anthropic API key not configured");

  const options: any = { apiKey: authKey };
  if (process.env.ANTHROPIC_BASE_URL) {
    options.baseURL = process.env.ANTHROPIC_BASE_URL;
  }
  return new Anthropic(options);
}

async function createAnthropicMessage(
  anthropic: Anthropic,
  params: {
    model: string;
    max_tokens: number;
    system: string;
    messages: any[];
  }
) {
  const requestedModel = params.model.toLowerCase();
  const candidates = [
    requestedModel,
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet-latest",
    "claude-3-7-sonnet-latest",
    "claude-3-7-sonnet-20250219",
    "claude-3-5-haiku-20241022",
    "claude-3-5-haiku-latest",
    "claude-3-haiku-20240307",
    "claude-3-opus-20240229"
  ];
  
  const uniqueCandidates = Array.from(new Set(candidates));
  let firstError: any = null;
  let lastError: any = null;
  
  for (const modelCandidate of uniqueCandidates) {
    try {
      console.log(`[Anthropic client] Executing query on candidate model: ${modelCandidate}`);
      return await anthropic.messages.create({
        ...params,
        model: modelCandidate
      });
    } catch (err: any) {
      if (!firstError) firstError = err;
      lastError = err;
      const errMsg = err.message || '';
      console.warn(`[Anthropic client] Model ${modelCandidate} failed: ${errMsg}. Trying next candidate...`);
      if (err.status === 401 || errMsg.includes('API key') || errMsg.includes('invalid_api_key')) {
        break;
      }
    }
  }
  
  const targetErr = firstError || lastError;
  const detailMsg = targetErr?.message || "Anthropic generation failed on all candidate models.";
  throw new Error(`Anthropic (${requestedModel}): ${detailMsg}`);
}

export async function generateTrizText(prompt: string, apiKey?: string): Promise<string> {
  const anthropic = getAnthropicClient(apiKey);
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
      - Analyze user DNA (niche, target audience, expertise, tone of voice).
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
  const anthropic = getAnthropicClient(apiKey);
  
  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    Based on this idea: "${coreIdea}", generate 6 distinct viral video scripts (scenarios) based on the CONTENT LEGO methodology.
    
    ${trizMatrix ? `
    --- STRATEGIC TRIZ 9-SCREEN MATRIX BLUEPRINT ---
    Use the following marketing analysis to enrich your scenarios, hooks, context and details. Align each scenario style with a relevant screen from this TRIZ matrix (e.g. Evergreen with System/Present, Trend with Supersystem/Future, Detective with System/Past):
    ${trizMatrix}
    ` : ""}
    
    CRITICAL LANGUAGE RULES:
    1. Respond EXCLUSIVELY in the active language: ${languageName.toUpperCase()}.
    2. All generated content, scenarios, hooks, context, meat, cta, broll descriptions, and social posts MUST be strictly in ${languageName.toUpperCase()}!
    
    CRITICAL: Each block (1-4) MUST contain FULL, READY-TO-SPEAK TEXT. No placeholders. No "abstract theses". No descriptions of what to say. ONLY the final words the actor will dictate.
    
    1. hook: Triple Hook (0-5s). Visual description + On-screen text (3-5 words) + Spoken words. Ends with a Curiosity Loop.
    2. body: Context & Agitation (15-20s dictation). Focus on "Thought Narration". MUST use a short, diverse, natural conversational transition at the beginning (e.g. "Look...", "Actually...", "Here is the catch...", "Смотрите...", "На самом деле...", "Тут фишка в чём...", "Глядите..."). NEVER use formal, technical or bookish language like "Let me explain" or "Позвольте объяснить". MUST be detailed, rich in specifics (avoid minimalism), and must reference facts, scientific proof, or statistics (e.g., "Scientists proved...", "Recent studies show...", "According to statistics...", "Ученые доказали...", "Последние исследования...").
    3. triz_inversion: Re-Hook & Meat (15-20s dictation). ENTRY PHRASE (Must be a contrast word): "BUT..." or "However..." or "The truth is...". RHYTHM: Staccato. STYLE: Empathetic researcher conducting a mini-investigation to find an unobvious fact. MUST be highly detailed, deep, and cite research/data to back up the claim.
    4. cta: Native CTA (15-20s dictation). ENTRY PHRASE: A natural, short conversational call (e.g. "So...", "If you want...", "Поэтому...", "Так что если хотите..."). Call to leave a KEYWORD in comments.

    STYLES to generate for the idea:
    1. controversial (The Contrarian): Attacking popular myths.
    2. edutainment (Shadow Investigator): Turning viewer weaknesses into superpowers.
    3. evergreen (Case Study): Desire-based breakdown of results.
    4. trends (The Listicle): Dynamic value list (weakest to strongest).
    5. detective (Investigative Detective): Mini-investigation by an empathetic researcher. Structure: 1. Hook by topic, 2. Body: take a real fact from the internet/studies and reference it, 3. TRIZ: contradiction using transitions ("однако выяснилось...", "Однако неочевидная сторона вопроса...", "есть и другой взгляд...", "но это также означает..."), 4. CTA: call to leave a comment to find out more.
    6. napkin_explainer (Marker & Board — Whiteboard Explainer): Slow-paced whiteboard animation script at 130 words/min. TOTAL WORD BUDGET: max 160 words across ALL 4 blocks (target 60-second video). Per-block word limits: hook.words ≤ 20 words | body.words ≤ 50 words | triz_inversion.words ≤ 60 words | cta.words ≤ 30 words. STRICT BLOCK-LEVEL RULES (MUST NOT cross-contaminate blocks — each block uses a DIFFERENT image/metaphor): hook.words = One single rhetorical question OR visual spatial riddle using a physical-world metaphor (labyrinth, lever, bridge, scales). MUST be max 2 sentences. MUST NOT contain the answer or any explanation. body.words = SWITCH to a completely DIFFERENT real-world analogy (NOT the one used in hook). Describe the problem as a physical process being drawn on a whiteboard. Cite one real stat or study. NO repetition of hook metaphor. triz_inversion.words = Decompose the SOLUTION into EXACTLY 3 numbered steps ("1. ... 2. ... 3. ..."). Each step is a concrete micro-action, not a concept. CTA must not reference a spatial metaphor — use a direct question to the viewer.

    Structure for EACH scenario (style):
    - style_name: controversial | edutainment | evergreen | trends | detective | napkin_explainer
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
      "detective": { ... },
      "napkin_explainer": { ... }
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
  const anthropic = getAnthropicClient(apiKey);
  
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

export async function generatePreviews(
  coreIdea: string,
  digitalShadow: string,
  locale: string = 'en',
  apiKey?: string,
  brandDna?: any,
  systemPromptBase?: string
) {
  const anthropic = getAnthropicClient(apiKey);
  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    Based on this idea: "${coreIdea}", generate 6 distinct viral video script previews based on the CONTENT LEGO methodology.
    
    CRITICAL LANGUAGE RULES:
    1. Respond EXCLUSIVELY in the active language: ${languageName.toUpperCase()}.
    2. All preview details MUST be strictly in ${languageName.toUpperCase()}!
    
    STYLES to generate previews for:
    1. controversial (The Contrarian): Attacking popular myths.
    2. edutainment (Shadow Investigator): Turning viewer weaknesses into superpowers.
    3. evergreen (Case Study): Desire-based breakdown of results.
    4. trends (The Listicle): Dynamic value list (weakest to strongest).
    5. detective (Investigative Detective): Mini-investigation by an empathetic researcher.
    6. napkin_explainer (Marker & Board — Whiteboard Explainer): Whiteboard animation script layout using spatial metaphors.
    
    Structure for EACH preview style:
    - title: Clear title in ${languageName.toUpperCase()} describing this specific angle (e.g. "Ложь о продуктивности / Productivity Lies")
    - hook: What attention-grabbing hook statement/angle will be used.
    - reveal: How the problem is unpacked/revealed.
    - meat: The core value/solution (meat/TRIZ inversion).
    - cta: Call to action focus.
    
    Output ONLY valid JSON in format: 
    {
      "controversial": { "title": "...", "hook": "...", "reveal": "...", "meat": "...", "cta": "..." },
      "edutainment": { "title": "...", "hook": "...", "reveal": "...", "meat": "...", "cta": "..." },
      "evergreen": { "title": "...", "hook": "...", "reveal": "...", "meat": "...", "cta": "..." },
      "trends": { "title": "...", "hook": "...", "reveal": "...", "meat": "...", "cta": "..." },
      "detective": { "title": "...", "hook": "...", "reveal": "...", "meat": "...", "cta": "..." },
      "napkin_explainer": { "title": "...", "hook": "...", "reveal": "...", "meat": "...", "cta": "..." }
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

export async function generateFullScript(
  coreIdea: string,
  selectedStyle: string,
  selectedPreview: any,
  digitalShadow: string,
  locale: string = 'en',
  apiKey?: string,
  brandDna?: any,
  systemPromptBase?: string
) {
  const anthropic = getAnthropicClient(apiKey);
  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    TASK: Generate a high-fidelity, high-quality, exactly 50-second viral video script based on the following selected preview and style.
    
    SELECTED STYLE: ${selectedStyle}
    
    SELECTED PREVIEW METADATA:
    ${JSON.stringify(selectedPreview, null, 2)}
    
    ORIGINAL CORE IDEA: "${coreIdea}"
    
    CRITICAL LANGUAGE RULES:
    1. Respond EXCLUSIVELY in the active language: ${languageName.toUpperCase()}.
    2. All generated content, hooks, body, triz_inversion, cta, broll descriptions, and social posts MUST be strictly in ${languageName.toUpperCase()}!
    
    CRITICAL STRUCTURE RULES (4 BLOCKS):
    1. hook: Triple Hook (0-5s). Visual description + On-screen text (3-5 words) + Spoken words. Ends with a Curiosity Loop.
    2. body: Context & Agitation (15-20s dictation). Focus on "Thought Narration". MUST use a short, diverse, natural conversational transition at the beginning (e.g. "Look...", "Actually...", "Here is the catch...", "Смотрите...", "На самом деле...", "Тут фишка в чём...", "Глядите..."). NEVER use formal, technical or bookish language like "Let me explain" or "Позвольте объяснить". MUST be detailed, rich in specifics (avoid minimalism), and must reference facts, scientific proof, or statistics (e.g., "Scientists proved...", "Recent studies show...", "According to statistics...").
    3. triz_inversion: Re-Hook & Meat (15-20s dictation). ENTRY PHRASE (Must be a contrast word): "BUT..." or "However..." or "The truth is...". RHYTHM: Staccato. STYLE: Empathetic researcher conducting a mini-investigation to find an unobvious fact. MUST be highly detailed, deep, and cite research/data to back up the claim.
    4. cta: Native CTA (15-20s dictation). ENTRY PHRASE: A natural, short conversational call (e.g. "So...", "If you want...", "Поэтому...", "Так что если хотите..."). Call to leave a KEYWORD in comments.
    
    STYLE-SPECIFIC DIRECTIVES:
    - controversial: Attack popular myths, create hard cognitive dissonance.
    - edutainment: Turn viewer weakness into a superpower, use irony/metaphors.
    - evergreen: Calm, deep breakdown of psychic/relationship laws, results-oriented.
    - trends: Relate to social media trends/memes, list format.
    - detective: Investigative detective style. Use transition phrases like "однако выяснилось..." / "Однако неочевидная сторона вопроса..." / "есть и другой взгляд..." in triz_inversion.
    - napkin_explainer: Slow-paced whiteboard animation (130 words/min). Max 160 words total. Use spatial physical metaphors (labyrinth, scales, bridge, lever). Decompose solution into EXACTLY 3 numbered steps in triz_inversion.
    
    Output MUST BE valid JSON format:
    {
      "hook": { "visual": "...", "screen_text": "...", "words": "..." },
      "body": { "words": "..." },
      "triz_inversion": { "words": "..." },
      "cta": { "words": "..." },
      "broll_prompt": "Action-semantic description of B-roll (5s) for the visual hook scene",
      "visual_hook": "Detailed cover image prompt for Midjourney/Flux representing the script's visual metaphor",
      "social_post": "Caption with 3 emojis + 3 tags"
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
