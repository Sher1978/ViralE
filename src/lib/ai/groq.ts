import { getSystemPrompt } from "./gemini"; // Use the same rules as Gemini
import { safeJsonParse } from "../utils";
 
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export async function generateTrizText(prompt: string, apiKey?: string): Promise<string> {
  const authKey = apiKey || process.env.GROQ_API_KEY || "";
  if (!authKey) throw new Error("Groq API key not configured");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${authKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: "You are a professional neuromarketer and creative strategist." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Groq TRIZ generation failed");
  }

  const data = await response.json();
  return data.choices[0].message.content || "";
}

export async function generateDailyIdeas(
  prompt: string,
  locale: string = 'en',
  apiKey?: string
): Promise<any[]> {
  const authKey = apiKey || process.env.GROQ_API_KEY || "";
  if (!authKey) throw new Error("Groq API key not configured");

  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${authKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: `You are the "Viral Engine" Strategic Consultant. Respond EXCLUSIVELY in ${languageName.toUpperCase()}. Return ONLY a JSON array.` },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Groq idea generation failed");
  }

  const data = await response.json();
  const content = data.choices[0].message.content || '';
  const parsed = safeJsonParse(content);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const arr = parsed.ideas || parsed.topics || parsed.data || Object.values(parsed).find(v => Array.isArray(v));
    if (Array.isArray(arr)) return arr;
  }
  return [];
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
  const authKey = apiKey || process.env.GROQ_API_KEY || "";
  if (!authKey) throw new Error("Groq API key not configured");

  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    Based on this idea: "${coreIdea}", generate 6 distinct viral video scripts (scenarios) based on the BRAND CONTENT ARCHITECT & CONTENT LEGO methodology.
    
    ${trizMatrix ? `
    --- STRATEGIC TRIZ 9-SCREEN MATRIX BLUEPRINT ---
    Use the following marketing analysis to enrich your scenarios, hooks, context and details. Align each scenario style with a relevant screen from this TRIZ matrix:
    ${trizMatrix}
    ` : ""}
    
    CRITICAL LANGUAGE RULES:
    1. Respond EXCLUSIVELY in the active language: ${languageName.toUpperCase()}.
    2. All generated content, scenarios, hooks, context, meat, cta, broll descriptions, and social posts MUST be strictly in ${languageName.toUpperCase()}!
    3. Even if the user DNA, Brand DNA, or the input idea "${coreIdea}" contains Russian or another language, you MUST translate it on the fly and output final spoken words EXCLUSIVELY in ${languageName.toUpperCase()}. Decouple the script language from the Brand DNA's language and respect the interface language: ${languageName.toUpperCase()}.
    
    CRITICAL: Each block (1-4) MUST contain FULL, READY-TO-SPEAK TEXT. No placeholders. No "abstract theses". ONLY the final words the actor will dictate.
    
    STRUCTURE RULES FOR EACH SCENARIO:
    0. matrix_pair: Explicitly name the pair used from Hook & Payoff Matrix (e.g. "Архетип Хука 1 (Разрушение мифа) + Payoff A (Аха-момент)").
    1. hook: Triple Hook (0-5s). Visual description + On-screen text (3-5 words) + Spoken words. Ends with a Curiosity Loop.
    2. micro_payoff: Promised Micro-Reward (5-15s dictation). Delivers Payoff A (Aha-moment), B (Guilt relief), C (1-2-3 Algorithm), or D (30s Tool/Template).
    3. body: Context & Agitation (15-20s dictation). Focus on "Thought Narration". MUST use a short, diverse, natural conversational transition at the beginning (e.g. "Look...", "Actually...", "Here is the catch...", "Смотрите...", "На самом деле...", "Тут фишка в чём...", "Глядите..."). NEVER use formal, technical or bookish language like "Let me explain" or "Позвольте объяснить". MUST be detailed, rich in specifics (avoid minimalism), and must reference facts, scientific proof, or statistics (e.g., "Scientists proved...", "Recent studies show...", "According to statistics...", "Ученые доказали...", "Последние исследования...").
    4. triz_inversion: Re-Hook & Meat (15-20s dictation). ENTRY PHRASE (Must be a contrast word): "BUT..." or "However..." or "The truth is...". Unpack main body through Guide & Plan lens in Staccato rhythm. STYLE: Empathetic researcher conducting a mini-investigation to find an unobvious fact. MUST be highly detailed, deep, and cite research/data to back up the claim.
    5. cta: Native CTA (15-20s dictation). ENTRY PHRASE: A natural, short conversational call (e.g. "So...", "If you want...", "Поэтому...", "Так что если хотите..."). Call to leave a KEYWORD in comments, leading to Success or steering away from Disaster.

    STYLES to generate for the idea:
    1. controversial (The Contrarian): Attacking popular myths.
    2. edutainment (Shadow Investigator): Turning viewer weaknesses into superpowers.
    3. evergreen (Case Study): Desire-based breakdown of results.
    4. trends (The Listicle): Dynamic value list (weakest to strongest). MUST ALWAYS be formatted as a listicle ("3 способа...", "5 ошибок...", "4 секрета...", "Вот 5 лайфхаков как...").
    5. detective (Investigative Detective): Mini-investigation by an empathetic researcher. Structure: 1. Hook by topic, 2. Body: take a real fact from the internet/studies and reference it, 3. TRIZ: contradiction using transitions ("однако выяснилось...", "Однако неочевидная сторона вопроса...", "есть и другой взгляд...", "но это также означает..."), 4. CTA: call to leave a comment to find out more.
    6. napkin_explainer (Marker & Board — Whiteboard Explainer): Slow-paced whiteboard animation script at 130 words/min. TOTAL WORD BUDGET: max 160 words across ALL blocks (target 60-second video). Per-block word limits: hook.words ≤ 20 words | body.words ≤ 50 words | triz_inversion.words ≤ 60 words | cta.words ≤ 30 words. STRICT BLOCK-LEVEL RULES (MUST NOT cross-contaminate blocks — each block uses a DIFFERENT image/metaphor): hook.words = One single rhetorical question OR visual spatial riddle using a physical-world metaphor (labyrinth, lever, bridge, scales). MUST be max 2 sentences. MUST NOT contain the answer or any explanation. body.words = SWITCH to a completely DIFFERENT real-world analogy (NOT the one used in hook). Describe the problem as a physical process being drawn on a whiteboard. Cite one real stat or study. NO repetition of hook metaphor. triz_inversion.words = Decompose the SOLUTION into EXACTLY 3 numbered steps ("1. ... 2. ... 3. ..."). Each step is a concrete micro-action, not a concept. CTA must not reference a spatial metaphor — use a direct question to the viewer.

    CRITICAL SPOKEN SPEECH RULE: Output ONLY direct first-person spoken words by the speaker (talking head / говорящая голова). Strictly NO scene descriptions, visual cues, camera instructions, B-roll remarks, or bracketed notes across any of the script blocks.

    Structure for EACH scenario:
    - style_name: controversial | edutainment | evergreen | trends | detective | napkin_explainer
    - matrix_pair: "Архетип Хука N + Payoff X"
    - hook: { "visual": "...", "screen_text": "...", "words": "..." }
    - micro_payoff: { "words": "..." }
    - body: { "words": "..." }
    - triz_inversion: { "words": "..." }
    - cta: { "words": "..." }
    - broll_prompt: Final action-semantic description for a 5s B-roll using Visual_Script_Generator metaphors.
    - visual_hook: Detailed cinematic prompt for Midjourney cover.
    - social_post: Engaging caption with emojis + tags.
    
    REMEMBER: Output in ${languageName}. 
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
  const content = data.choices[0].message.content || '';
  const parsed = safeJsonParse(content);
  if (parsed) return parsed;
  console.warn(`[Groq:generateScript] JSON parse failed. Raw snippet: "${content.slice(0, 250)}"`);
  throw new Error(locale === 'ru' ? '[Groq:generateScript] Ошибка формата ответа Groq.' : '[Groq:generateScript] Groq returned invalid JSON structure.');
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
  const authKey = apiKey || process.env.GROQ_API_KEY || "";
  if (!authKey) throw new Error("Groq API key not configured");

  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);
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
  const content = data.choices[0].message.content || '';
  const parsed = safeJsonParse(content);
  if (parsed) return parsed;
  console.warn(`[Groq:refineScript] JSON parse failed. Raw snippet: "${content.slice(0, 250)}"`);
  throw new Error(locale === 'ru' ? '[Groq:refineScript] Ошибка формата при редактировании.' : '[Groq:refineScript] Groq returned invalid JSON structure during refinement.');
}

export async function generatePreviews(
  coreIdea: string,
  digitalShadow: string,
  locale: string = 'en',
  apiKey?: string,
  brandDna?: any,
  systemPromptBase?: string
) {
  const authKey = apiKey || process.env.GROQ_API_KEY || "";
  if (!authKey) throw new Error("Groq API key not configured");

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
    throw new Error(err.error?.message || "Groq previews generation failed");
  }

  const data = await response.json();
  const content = data.choices[0].message.content || '';
  const parsed = safeJsonParse(content);
  if (parsed) return parsed;
  console.warn(`[Groq:generatePreviews] JSON parse failed. Raw snippet: "${content.slice(0, 250)}"`);
  throw new Error(locale === 'ru' ? '[Groq:generatePreviews] Ошибка формата превью.' : '[Groq:generatePreviews] Groq returned invalid previews format.');
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
  const authKey = apiKey || process.env.GROQ_API_KEY || "";
  if (!authKey) throw new Error("Groq API key not configured");

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
    
    CRITICAL STRUCTURE RULES (4-5 BLOCKS):
    0. matrix_pair: Explicitly name the pair used from Hook & Payoff Matrix (e.g. "Архетип Хука 1 (Разрушение мифа) + Payoff A (Аха-момент)").
    1. hook: Triple Hook (0-5s). Visual description + On-screen text (3-5 words) + Spoken words. Ends with a Curiosity Loop.
    2. micro_payoff: Promised Micro-Reward (5-15s dictation). Delivers Payoff A (Aha-moment), B (Guilt relief), C (1-2-3 Algorithm), or D (30s Tool/Template).
    3. body: Context & Agitation (15-20s dictation). Focus on "Thought Narration". MUST use a short, diverse, natural conversational transition at the beginning (e.g. "Look...", "Actually...", "Here is the catch...", "Смотрите...", "На самом деле...", "Тут фишка в чём...", "Глядите..."). NEVER use formal, technical or bookish language like "Let me explain" or "Позвольте объяснить". MUST be detailed, rich in specifics (avoid minimalism), and must reference facts, scientific proof, or statistics (e.g., "Scientists proved...", "Recent studies show...", "According to statistics...").
    4. triz_inversion: Re-Hook & Meat (15-20s dictation). ENTRY PHRASE (Must be a contrast word): "BUT..." or "However..." or "The truth is...". Unpack main body through Guide & Plan lens in Staccato rhythm. STYLE: Empathetic researcher conducting a mini-investigation to find an unobvious fact. MUST be highly detailed, deep, and cite research/data to back up the claim.
    5. cta: Native CTA (15-20s dictation). ENTRY PHRASE: A natural, short conversational call (e.g. "So...", "If you want...", "Поэтому...", "Так что если хотите..."). Call to leave a KEYWORD in comments, leading to Success or steering away from Disaster.
    
    STYLE-SPECIFIC DIRECTIVES:
    - controversial: Attack popular myths, create hard cognitive dissonance.
    - edutadecimal: Turn viewer weakness into a superpower, use irony/metaphors.
    - evergreen: Calm, deep breakdown of psychic/relationship laws, results-oriented.
    - trends: Relate to social media trends/memes, list format.
    - detective: Investigative detective style. Use transition phrases like "однако выяснилось..." / "Однако неочевидная сторона вопроса..." / "есть и другой взгляд..." in triz_inversion.
    - napkin_explainer: Slow-paced whiteboard animation (130 words/min). Max 160 words total. Use spatial physical metaphors (labyrinth, scales, bridge, lever). Decompose solution into EXACTLY 3 numbered steps in triz_inversion.
    
    Output MUST BE valid JSON format:
    {
      "matrix_pair": "Архетип Хука N + Payoff X",
      "hook": { "visual": "...", "screen_text": "...", "words": "..." },
      "micro_payoff": { "words": "..." },
      "body": { "words": "..." },
      "triz_inversion": { "words": "..." },
      "cta": { "words": "..." },
      "broll_prompt": "Action-semantic description of B-roll (5s) for the visual hook scene",
      "visual_hook": "Detailed cover image prompt for Midjourney/Flux representing the script's visual metaphor",
      "social_post": "Caption with 3 emojis + 3 tags"
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
    throw new Error(err.error?.message || "Groq script generation failed");
  }

  const data = await response.json();
  const content = data.choices[0].message.content || '';
  const parsed = safeJsonParse(content);
  if (parsed) return parsed;
  console.warn(`[Groq:generateFullScript] JSON parse failed. Raw snippet: "${content.slice(0, 250)}"`);
  throw new Error(locale === 'ru' ? '[Groq:generateFullScript] Ошибка формата сценария.' : '[Groq:generateFullScript] Groq returned invalid script format.');
}

export async function generateTurboScript(
  coreIdea: string,
  digitalShadow: string,
  locale: string = 'en',
  apiKey?: string,
  brandDna?: any,
  systemPromptBase?: string
) {
  const authKey = apiKey || process.env.GROQ_API_KEY || "";
  if (!authKey) throw new Error("Groq API key not configured");

  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    TASK: Execute 1-CLICK TURBO GENERATION for the following core idea using Groq Llama 3.3.
    Analyze the speaker's Brand DNA, niche, target audience, and main pain points, then automatically choose the single best Hook Archetype, Micro-Payoff, and Narrative Style to synthesize a complete 50-second viral script.
    
    ORIGINAL CORE IDEA: "${coreIdea}"
    
    AUTOMATED DECISION ENGINE (INTERNAL STEP):
    1. Hook Archetype: Auto-select from Myth Buster, Paradox/Unfair Advantage, Hero Identification, or Counter-intuitive Choice.
    2. Micro-Payoff: Auto-select Payoff A (Aha-moment), B (Guilt relief), C (1-2-3 Algorithm), or D (30s Tool/Template).
    3. Style: Auto-select controversial, edutainment, evergreen, trends, detective, or napkin_explainer.
    
    CRITICAL LANGUAGE RULES:
    1. Respond EXCLUSIVELY in the active language: ${languageName.toUpperCase()}.
    2. All generated content, hooks, body, triz_inversion, cta, broll descriptions, and social posts MUST be strictly in ${languageName.toUpperCase()}!
    
    CRITICAL STRUCTURE RULES (100% SPOKEN DICTATION TEXT):
    - matrix_pair: Name the chosen pair (e.g. "Архетип Хука 1 (Разрушение мифа) + Payoff A (Аха-момент)").
    - selected_style: Name the auto-chosen style (e.g. "edutainment").
    - hook: Triple Hook (0-5s). Visual description + On-screen text (3-5 words) + Spoken words.
    - micro_payoff: Promised Micro-Reward (5-15s dictation).
    - body: Context & Agitation (15-20s dictation) with natural conversational transition.
    - triz_inversion: Re-Hook & Meat (15-20s dictation) starting with contrast word ("BUT..." / "Однако...") in Staccato rhythm.
    - cta: Native CTA (15-20s dictation) with keyword call to action.
    
    CRITICAL SPOKEN SPEECH RULE: Output ONLY direct first-person spoken words by the speaker (talking head / говорящая голова). Strictly NO scene descriptions, visual cues, camera instructions, B-roll remarks, or bracketed notes across any of the script blocks.
    
    Output MUST BE valid JSON format:
    {
      "matrix_pair": "Архетип Хука N + Payoff X",
      "selected_style": "controversial | edutainment | evergreen | trends | detective | napkin_explainer",
      "hook": { "visual": "...", "screen_text": "...", "words": "..." },
      "micro_payoff": { "words": "..." },
      "body": { "words": "..." },
      "triz_inversion": { "words": "..." },
      "cta": { "words": "..." },
      "broll_prompt": "Action-semantic description of B-roll (5s) for the visual hook scene",
      "visual_hook": "Detailed cover image prompt for Midjourney/Flux representing the script's visual metaphor",
      "social_post": "Caption with 3 emojis + 3 tags"
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
    throw new Error(err.error?.message || "Groq turbo generation failed");
  }

  const data = await response.json();
  const content = data.choices[0].message.content || '';
  const parsed = safeJsonParse(content);
  if (parsed) return parsed;
  console.warn(`[Groq:generateTurboScript] JSON parse failed. Raw snippet: "${content.slice(0, 250)}"`);
  throw new Error(locale === 'ru' ? '[Groq:generateTurboScript] Ошибка формата турбо-сценария.' : '[Groq:generateTurboScript] Groq returned invalid turbo script format.');
}
