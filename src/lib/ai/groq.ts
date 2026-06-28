import { getSystemPrompt } from "./gemini"; // Use the same rules as Gemini
 
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
    Based on this idea: "${coreIdea}", generate 6 distinct viral video scripts (scenarios) based on the CONTENT LEGO methodology.
    
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

    Structure for EACH scenario:
    - style_name: controversial | edutainment | evergreen | trends | detective | napkin_explainer
    - hook: { "visual": "...", "screen_text": "...", "words": "..." }
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
  const content = data.choices[0].message.content;
  return JSON.parse(content);
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
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}
