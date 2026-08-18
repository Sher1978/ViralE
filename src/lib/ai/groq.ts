import { getSystemPrompt } from "./gemini"; // Use the same rules as Gemini
import { safeJsonParse } from "../utils";
 
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

function getGroqSystemPrompt(digitalShadow: string, locale: string = 'en', brandDna?: any, systemPromptBase?: string) {
  const basePrompt = getSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);
  const language = locale === 'ru' ? 'Russian' : 'English';
  
  return `
    ${basePrompt}

    🔥 HIGH-DENSITY CONTENT & VIVID STYLE DIRECTIVES FOR GROQ LLAMA-3.3:
    1. EXTREME RICHNESS & DEPTH: Avoid dry, primitive, or cliché AI statements. Use vivid metaphors, strong psychological triggers, concrete numbers/facts, and deep emotional resonance.
    2. SPOKEN DYNAMICS (STACCATO RHYTHM): Write like an elite top-tier creator talking directly into the camera. Vary sentence length. Combine sharp punchy hooks with rich explanatory depth.
    3. NO BOT TEXT & NO GENERIC INTROS: NEVER start with "Привет!", "В этом видео...", "Сегодня я скажу...", "Давайте разберем...". Start DIRECTLY with the jaw-dropping contrast or hook.
    4. NATURAL CONVERSATIONAL TRANSITIONS (${language.toUpperCase()}): Use rich, natural conversational bridges (e.g. for Russian: "Смотрите...", "Смысл в том...", "Тут фишка в чём...", "На самом деле...", "Но самое интересное...").
    5. VISUAL METAPHORS & B-ROLL: Make cover image prompts (visual_hook) and broll_prompt cinematic, detailed, ultra-realistic, photorealistic (sony a7r IV 35mm lens, dynamic studio lighting).
    6. OUTPUT EXCLUSIVELY VALID JSON: Keep JSON syntax strict while filling content values with dense, high-impact storytelling.
  `;
}

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
        { role: "system", content: "You are an elite neuromarketer, high-conversion copywriter, and creative strategist. Write rich, vivid, deeply analytical, and non-generic content." },
        { role: "user", content: prompt }
      ],
      temperature: 0.75,
      top_p: 0.9
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
        { 
          role: "system", 
          content: `You are the "Viral Engine" Strategic Consultant. Generate high-density, sharp, non-cliché video topic ideas. Respond EXCLUSIVELY in ${languageName.toUpperCase()}. Return ONLY a valid JSON array of 5 idea objects with fields topic_title, rationale, viral_potential_score (85-99), category.` 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      top_p: 0.95
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

  const systemPrompt = getGroqSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    Based on this idea: "${coreIdea}", generate 6 distinct viral video scripts (scenarios) based on the BRAND CONTENT ARCHITECT & CONTENT LEGO methodology.
    
    ${trizMatrix ? `
    --- STRATEGIC TRIZ 9-SCREEN MATRIX BLUEPRINT ---
    Use the following marketing analysis to enrich your scenarios, hooks, context and details. Align each scenario style with a relevant screen from this TRIZ matrix:
    ${trizMatrix}
    ` : ""}
    
    CRITICAL QUALITY & LANGUAGE DIRECTIVES:
    1. Respond EXCLUSIVELY in active language: ${languageName.toUpperCase()}.
    2. HIGH-DENSITY STORYTELLING: Avoid primitive or minimal phrasing. Fill each spoken block with detailed, specific, high-conversion dictation text.
    3. Even if input or Brand DNA is in another language, translate on the fly and output spoken words strictly in ${languageName.toUpperCase()}.
    
    CRITICAL: Each block (1-4) MUST contain FULL, READY-TO-SPEAK TEXT. No placeholders. No "abstract theses". ONLY the final words the actor will dictate.
    
    STRUCTURE RULES FOR EACH SCENARIO:
    0. matrix_pair: Explicitly name the pair used from Hook & Payoff Matrix (e.g. "Архетип Хука 1 (Разрушение мифа) + Payoff A (Аха-момент)").
    1. hook: Triple Hook (0-5s). Visual description + On-screen text (3-5 words) + Spoken words. Ends with a Curiosity Loop.
    2. micro_payoff: Promised Micro-Reward (5-15s dictation). Delivers Payoff A (Aha-moment), B (Guilt relief), C (1-2-3 Algorithm), or D (30s Tool/Template).
    3. body: Context & Agitation (15-20s dictation). Focus on "Thought Narration". MUST use a short, diverse, natural conversational transition at the beginning (e.g. "Look...", "Actually...", "Here is the catch...", "Смотрите...", "На самом деле...", "Тут фишка в чём...", "Глядите..."). NEVER use formal, technical or bookish language like "Let me explain" or "Позвольте объяснить". MUST be detailed, rich in specifics (avoid minimalism), and must reference facts, scientific proof, or statistics.
    4. triz_inversion: Re-Hook & Meat (15-20s dictation). ENTRY PHRASE (Must be a contrast word): "BUT..." or "However..." or "The truth is...". Unpack main body through Guide & Plan lens in Staccato rhythm. STYLE: Empathetic researcher conducting a mini-investigation to find an unobvious fact. MUST be highly detailed, deep, and cite research/data to back up the claim.
    5. cta: Native CTA (15-20s dictation). ENTRY PHRASE: A natural, short conversational call (e.g. "So...", "If you want...", "Поэтому...", "Так что если хотите..."). Call to leave a KEYWORD in comments, leading to Success or steering away from Disaster.

    STYLES to generate for the idea:
    1. controversial (The Contrarian): Attacking popular myths with cognitive dissonance.
    2. edutainment (Shadow Investigator): Turning viewer weaknesses into superpowers using irony and rich metaphors.
    3. evergreen (Case Study): Desire-based breakdown of results with psychological authority.
    4. trends (The Listicle): Dynamic value list (weakest to strongest). Format as listicle ("3 способы...", "5 ошибок...").
    5. detective (Investigative Detective): Mini-investigation by an empathetic researcher with surprising turns.
    6. napkin_explainer (Marker & Board — Whiteboard Explainer): Whiteboard animation script with physical-world metaphors.

    CRITICAL SPOKEN SPEECH RULE: Output ONLY direct first-person spoken words by the speaker (talking head / говорящая голова). Strictly NO scene descriptions or camera instructions across script text blocks.

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
      response_format: { type: "json_object" },
      temperature: 0.75,
      top_p: 0.9
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

  const systemPrompt = getGroqSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    EXISTING SCRIPT:
    ${JSON.stringify(currentScript, null, 2)}
    
    INSTRUCTION FOR REFINEMENT: "${instruction}"
    
    TASK: Refine the script based on the instruction. Make the resulting text rich, vivid, deep, and highly persuasive.
    Maintain Content Lego methodology and Brand DNA style.
    
    CRITICAL: 
    - Maintain the user's digital shadow and style.
    - Output in ${languageName}. 
    - Output ONLY valid JSON in the exact same structure as the existing script.
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
      response_format: { type: "json_object" },
      temperature: 0.75,
      top_p: 0.9
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

  const systemPrompt = getGroqSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    Based on this idea: "${coreIdea}", generate 6 distinct viral video script previews based on the CONTENT LEGO methodology.
    
    CRITICAL QUALITY & LANGUAGE DIRECTIVES:
    1. Respond EXCLUSIVELY in active language: ${languageName.toUpperCase()}.
    2. Ensure each preview has rich, intriguing, high-retention angles.
    
    STYLES to generate previews for:
    1. controversial (The Contrarian): Attacking popular myths.
    2. edutainment (Shadow Investigator): Turning viewer weaknesses into superpowers.
    3. evergreen (Case Study): Desire-based breakdown of results.
    4. trends (The Listicle): Dynamic value list (weakest to strongest).
    5. detective (Investigative Detective): Mini-investigation by an empathetic researcher.
    6. napkin_explainer (Marker & Board — Whiteboard Explainer): Whiteboard animation script layout using spatial metaphors.
    
    Structure for EACH preview style:
    - title: Clear title in ${languageName.toUpperCase()} describing this specific angle
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
      response_format: { type: "json_object" },
      temperature: 0.75,
      top_p: 0.9
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

  const systemPrompt = getGroqSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    TASK: Generate a high-fidelity, vivid, deeply engaging 50-second viral video script based on the following selected preview and style.
    
    SELECTED STYLE: ${selectedStyle}
    
    SELECTED PREVIEW METADATA:
    ${JSON.stringify(selectedPreview, null, 2)}
    
    ORIGINAL CORE IDEA: "${coreIdea}"
    
    CRITICAL QUALITY DIRECTIVES:
    1. Respond EXCLUSIVELY in active language: ${languageName.toUpperCase()}.
    2. HIGH-DENSITY TEXT: Fill each block with rich, persuasive spoken words. Avoid short, dry, primitive sentences.
    3. Use sharp conversational transitions and specific research/data references.
    
    CRITICAL STRUCTURE RULES (4-5 BLOCKS):
    0. matrix_pair: Explicitly name the pair used from Hook & Payoff Matrix (e.g. "Архетип Хука 1 (Разрушение мифа) + Payoff A (Аха-момент)").
    1. hook: Triple Hook (0-5s). Visual description + On-screen text (3-5 words) + Spoken words. Ends with a Curiosity Loop.
    2. micro_payoff: Promised Micro-Reward (5-15s dictation). Delivers Payoff A, B, C, or D.
    3. body: Context & Agitation (15-20s dictation). Focus on "Thought Narration". Natural conversational transition at start. Detailed, rich in specifics and real stats.
    4. triz_inversion: Re-Hook & Meat (15-20s dictation). Starts with contrast word ("BUT..." / "Однако..."). Staccato rhythm. High detail.
    5. cta: Native CTA (15-20s dictation). Natural call to action with keyword.
    
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
      response_format: { type: "json_object" },
      temperature: 0.75,
      top_p: 0.9
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

  const systemPrompt = getGroqSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    TASK: Execute 1-CLICK TURBO GENERATION for the following core idea using Groq Llama 3.3.
    Analyze the speaker's Brand DNA, niche, target audience, and main pain points, then automatically choose the single best Hook Archetype, Micro-Payoff, and Narrative Style to synthesize a complete, highly vivid 50-second viral script.
    
    ORIGINAL CORE IDEA: "${coreIdea}"
    
    CRITICAL HIGH-DENSITY DIRECTIVES:
    1. Respond EXCLUSIVELY in active language: ${languageName.toUpperCase()}.
    2. RICH & PERSUASIVE TEXT: Avoid brief, primitive, or dry sentences. Fill every spoken dictation block with deep expertise, vivid metaphors, sharp transitions, and concrete value.
    3. Output strictly 100% spoken dictation text for the speaker. Zero brackets or scene cues in script blocks.
    
    AUTOMATED DECISION ENGINE (INTERNAL STEP):
    1. Hook Archetype: Auto-select from Myth Buster, Paradox/Unfair Advantage, Hero Identification, or Counter-intuitive Choice.
    2. Micro-Payoff: Auto-select Payoff A (Aha-moment), B (Guilt relief), C (1-2-3 Algorithm), or D (30s Tool/Template).
    3. Style: Auto-select controversial, edutainment, evergreen, trends, detective, or napkin_explainer.
    
    CRITICAL STRUCTURE RULES:
    - matrix_pair: Name the chosen pair (e.g. "Архетип Хука 1 (Разрушение мифа) + Payoff A (Аха-момент)").
    - selected_style: Name the auto-chosen style (e.g. "edutainment").
    - hook: Triple Hook (0-5s). Visual description + On-screen text (3-5 words) + Spoken words.
    - micro_payoff: Promised Micro-Reward (5-15s dictation).
    - body: Context & Agitation (15-20s dictation) with natural conversational transition and real stats/facts.
    - triz_inversion: Re-Hook & Meat (15-20s dictation) starting with contrast word ("BUT..." / "Однако...") in Staccato rhythm.
    - cta: Native CTA (15-20s dictation) with keyword call to action.
    
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
      response_format: { type: "json_object" },
      temperature: 0.75,
      top_p: 0.9
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
