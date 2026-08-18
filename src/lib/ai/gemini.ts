import { GoogleGenerativeAI } from "@google/generative-ai";
import * as groq from "./groq";
import { safeJsonParse } from "../utils";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// [REVERSIBLE OVERRIDE] Set to true to route all Gemini calls to Groq
const IS_GROQ_OVERRIDE = process.env.OVERRIDE_GEMINI_WITH_GROQ === 'true';

export function normalizeModelName(rawName?: string): string {
  if (!rawName || typeof rawName !== 'string') return 'gemini-2.0-flash-exp';
  let name = rawName.trim();
  if (name.startsWith('models/')) {
    name = name.replace(/^models\//i, '');
  }
  if (!name.toLowerCase().startsWith('gemini-')) {
    name = `gemini-${name}`;
  }
  return name;
}

// ✅ VERIFIED WORKING MODELS (new API key - full access tier)
// gemini-2.5-flash → gemini-2.0-flash → gemini-1.5-flash-latest → gemini-1.5-flash
export const FAST_MODEL = normalizeModelName(process.env.GEMINI_MODEL || "gemini-2.5-flash");
export const PRO_MODEL = normalizeModelName(process.env.GEMINI_MODEL || "gemini-2.5-flash");

export function getModel(
  tier: 'fast' | 'pro' = 'fast', 
  locale: string = 'en', 
  mimeType: 'json' | 'text' = 'json', 
  apiKey?: string,
  systemInstruction?: string
) {
  if (IS_GROQ_OVERRIDE) {
    const language = locale === 'ru' ? 'Russian' : 'English';
    // Return a proxy that mimics the Gemini model interface but calls Groq
    return {
      startChat: (config: any) => ({
        sendMessageStream: async (parts: any[]) => {
            const textPrompt = parts.map(p => typeof p === 'string' ? p : p.text || JSON.stringify(p)).join('\n');
            const groqKey = process.env.GROQ_API_KEY || '';
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${groqKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                  { 
                    role: "system", 
                    content: `${systemInstruction || config.systemInstruction || ''}
                    
                    CRITICAL LANGUAGE RULES:
                    1. Respond EXCLUSIVELY in ${language.toUpperCase()}.
                    2. NEVER use dry, robotic, or overly technical introductory phrases like "Позвольте объяснить", "Дело в том, что...", "Notice this...", "Let me explain...".
                    3. Instead, use diverse, short, natural conversational transitions (e.g. for Russian: "Смотрите...", "Смысл в том...", "Тут фишка в чём...", "Прикол в том...", "Глядите...", "На самом деле...", "Но самое интересное...").
                    4. Start directly with the text. No conversational filler.
                    5. Keep the output descriptive, engaging, and professional. Avoid dry or overly robotic phrasing.`
                  },
                  { role: "user", content: textPrompt }
                ],
                temperature: 0.7,
                stream: true
              })
            });

            if (!response.ok) throw new Error("Groq streaming failed");

            // Mock the Gemini stream interface
            return {
              stream: (async function* () {
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                while (true) {
                  const { done, value } = await reader!.read();
                  if (done) break;
                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || '';
                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      const data = line.slice(6);
                      if (data === '[DONE]') continue;
                      try {
                        const json = JSON.parse(data);
                        const chunk = json.choices[0].delta.content || '';
                        if (chunk) {
                          yield { text: () => chunk, functionCalls: () => [] };
                        }
                      } catch (e) {}
                    }
                  }
                }
              })()
            };
        }
      }),
      generateContent: async (prompt: string | any[]) => {
        const textPrompt = Array.isArray(prompt) 
          ? prompt.map(p => typeof p === 'string' ? p : p.text || JSON.stringify(p)).join('\n') 
          : (typeof prompt === 'string' ? prompt : JSON.stringify(prompt));
          
        const groqKey = process.env.GROQ_API_KEY || '';
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { 
                role: "system", 
                content: `${getSystemPrompt('', locale)}
                
                CRITICAL LANGUAGE RULES:
                1. Respond EXCLUSIVELY in ${language.toUpperCase()}.
                2. NEVER use English introductory phrases like "The thing is...", "Notice this...", "That's why...". 
                3. Use natural ${language.toUpperCase()} transitions.
                4. Always return valid JSON if requested.
                5. Output should be vivid, descriptive and high-conversion.` 
              },
              { role: "user", content: textPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
          })
        });
        
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || "Groq override failed");
        }
        
        const data = await response.json();
        return {
          response: {
            text: () => data.choices[0].message.content
          }
        };
      }
    } as any;
  }

  const baseModelName = normalizeModelName(tier === 'fast' ? FAST_MODEL : PRO_MODEL);
  const client = apiKey ? new GoogleGenerativeAI(apiKey) : genAI;
  
  // ✅ Verified working models with new API key (full access tier):
  const rawCandidates = [
    baseModelName,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash"
  ];
  const fallbackModels = Array.from(new Set(rawCandidates.map(normalizeModelName)));

  // Return a proxy to intercept calls and inject automatic fallbacks on API errors
  const baseModel = client.getGenerativeModel({ 
    model: baseModelName,
    systemInstruction,
    generationConfig: {
      responseMimeType: mimeType === 'json' ? "application/json" : "text/plain",
    }
  });

  return new Proxy(baseModel, {
    get(target, prop, receiver) {
      if (prop === 'generateContent') {
        return async function(prompt: any, config?: any) {
          let lastError: any = null;
          
          for (const modelCandidate of fallbackModels) {
            try {
              console.log(`[Gemini client] Executing query on candidate model: ${modelCandidate}`);
              const modelInstance = client.getGenerativeModel({
                model: modelCandidate,
                systemInstruction,
                generationConfig: {
                  responseMimeType: mimeType === 'json' ? "application/json" : "text/plain",
                }
              });
              return await modelInstance.generateContent(prompt, config);
            } catch (err: any) {
              lastError = err;
              const errMsg = err.message || '';
              console.warn(`[Gemini client] Model ${modelCandidate} failed: ${errMsg}. Trying next candidate...`);
              // If it's a authorization error, stop fallback cycle
              if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('key is invalid')) {
                break;
              }
            }
          }
          
          throw lastError || new Error("Gemini generation failed on all fallback candidates.");
        };
      }
      if (prop === 'startChat') {
        return function(chatConfig: any) {
          let currentModelIndex = 0;
          let chatSession = target.startChat(chatConfig);
          
          return new Proxy(chatSession, {
            get(chatTarget, chatProp, chatReceiver) {
              if (chatProp === 'sendMessageStream') {
                return async function(parts: any[]) {
                  let lastError: any = null;
                  
                  for (let i = currentModelIndex; i < fallbackModels.length; i++) {
                    const modelCandidate = fallbackModels[i];
                    try {
                      console.log(`[Gemini client chat] Sending message on candidate model: ${modelCandidate}`);
                      if (i > currentModelIndex) {
                        const fallbackModelInstance = client.getGenerativeModel({
                          model: modelCandidate,
                          systemInstruction,
                          generationConfig: {
                            responseMimeType: mimeType === 'json' ? "application/json" : "text/plain",
                          }
                        });
                        chatSession = fallbackModelInstance.startChat(chatConfig);
                        currentModelIndex = i;
                      }
                      return await chatSession.sendMessageStream(parts);
                    } catch (err: any) {
                      lastError = err;
                      const errMsg = err.message || '';
                      console.warn(`[Gemini client chat] Model ${modelCandidate} failed: ${errMsg}. Trying next...`);
                      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('key is invalid')) break;
                    }
                  }
                  throw lastError || new Error("Gemini chat sendMessageStream failed on all fallback candidates.");
                };
              }
              return Reflect.get(chatTarget, chatProp, chatReceiver);
            }
          });
        };
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}

// Default export instance for compatibility
export const model = getModel('fast');

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
    You are an ELITE BRAND CONTENT ARCHITECT, NEUROMARKETER, AND VIRAL CONTENT SCRIPTWRITER. 
    Your mission: Generate high-conversion scripts, posts, and ideas that break banner blindness and turn viewers into loyal clients.
    
    SYSTEM CONTEXT:
    - Industry: ${industry}
    - Brand/User DNA & Persona: ${persona}
    - Deep Knowledge Base: ${knowledgeBase}
    
    3-STEP BRAND CONTENT ARCHITECT WORKFLOW:
    
    STEP 1: INGESTION (Brand DNA & StoryBrand 2-Way Synthesis)
    - Synthesize Brand DNA (niche, product, target audience, expertise, unfair advantage) and Donald Miller's StoryBrand (Hero, Enemy/Problem, Guide, Plan, Success, Disaster).
    - If only one document is available, logically infer the missing nodes (e.g. Hero = Target Audience, Enemy = Inner Pain, Guide = Author/Expertise, Plan = Product/Methodology, Success = Desired Result, Disaster = Risk of Inaction).
    
    STEP 2: PRE-GENERATION (Hook & Payoff Matrix Formulation)
    Construct and maintain in internal context a 4x4 Hook & Payoff Matrix:
    Hook Archetypes:
    1. Myth Buster (Enemy/Problem): "Перестаньте [типичное действие из ДНК], если не хотите [Катастрофа из StoryBrand]."
    2. Paradox / Unfair Advantage (Expertise/DNA): "Почему 90% в [Ниша] проигрывают тем, кто использует [Нечестное преимущество]?"
    3. Hero Identification (Hero + Pain): "Если вы [Тип клиента из ДНК] и до сих пор сталкиваетесь с [Внутренняя проблема из StoryBrand], досмотрите до конца."
    4. Counter-intuitive Choice (Plan/Guide): "Единственная причина, почему у вас нет [Желанный результат из StoryBrand] — это не [Ложный факт], а [Настоящий фактор из Плана]."
    Micro-Payoffs:
    - Payoff A (Aha-Moment): Unexpected paradigm shift in the first 15 seconds.
    - Payoff B (Guilt Relief): Explanation of why past failures are not the Hero's fault.
    - Payoff C (1-2-3 Algorithm): Clear step-by-step action without fluff.
    - Payoff D (30s Tool/Template): Ready-to-use solution in 30 seconds.
    
    STEP 3: EXECUTION (Script Construction)
    For each scenario/topic:
    1. Pick the best matching (Hook Archetype + Micro-Payoff) pair from the matrix.
    2. Opening Hook (0-5s): Apply formula from selected Hook Archetype.
    3. Micro-Payoff (5-15s): Deliver promised Payoff A/B/C/D.
    4. Main Body / TRIZ (15-45s): Unpack through Guide & Plan lens with staccato rhythm, scientific proof, and re-hooks.
    5. CTA (45-60s): End with clear Call To Action leading to Success or avoiding Disaster.
    
    CORE RULES:
    - NEVER use generic greetings or clichéd phrases. Start directly with the essence.
    - VISUAL PROMPT LOGIC (Visual_Script_Generator): 
      - Analyze user DNA (niche, target audience, expertise, tone of voice).
      - Semantic Analysis: [DNA Context] + [Phrase Meaning] = [Visual Metaphor].
      - Structure: (Global Style Anchor), (Action/Object representing metaphor), (Environment), (Mood), --no fantasy, noir, cartoon.
      - Global Styles: 
        1. Premium Business: "Cinematic photography, high-end commercial aesthetic, professional lighting, Sony A7R IV, 35mm lens."
        2. Expert Minimalist: "Clean background, soft studio lighting, minimalist composition, 8k resolution, photorealistic."
        3. Lifestyle & Travel: "Natural sunlight, vibrant colors, GoPro-style or drone-shot aesthetic."
    - TOTAL duration: ~60-80 SECONDS total (approx. 180-220 words total).
    - CRITICAL: Generate content ONLY in the SAME LANGUAGE as the provided topic or idea. If input is Russian, output Russian. If input is Ukrainian, output Ukrainian. 
    - Output MUST be valid JSON.
  `;
}


export async function generateScript(coreIdea: string, digitalShadow: string, locale: string = 'en', apiKey?: string, brandDna?: any, hook?: string, role?: string, trizMatrix?: string, systemPromptBase?: string) {
  if (IS_GROQ_OVERRIDE) {
    return groq.generateScript(coreIdea, digitalShadow, locale, apiKey || process.env.GROQ_API_KEY, brandDna, trizMatrix, systemPromptBase);
  }
  const targetModel = getModel('fast', locale, 'json', apiKey);

  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    Based on this idea: "${coreIdea}", generate 6 distinct viral video scripts (scenarios) based on the BRAND CONTENT ARCHITECT & CONTENT LEGO methodology.
    
    ${trizMatrix ? `
    --- STRATEGIC TRIZ 9-SCREEN MATRIX BLUEPRINT ---
    Use the following marketing analysis to enrich your scenarios, hooks, context and details. Align each scenario style with a relevant screen from this TRIZ matrix (e.g. Evergreen with System/Present, Trend with Supersystem/Future, Detective with System/Past):
    ${trizMatrix}
    ` : ""}
    
    CRITICAL LANGUAGE RULES:
    1. Respond EXCLUSIVELY in the active language: ${languageName.toUpperCase()}.
    2. All generated content, scenarios, hooks, context, meat, cta, broll descriptions, and social posts MUST be strictly in ${languageName.toUpperCase()}!
    3. Even if the user DNA, Brand DNA, or the input idea "${coreIdea}" contains Russian or another language, you MUST translate it on the fly and output final spoken words EXCLUSIVELY in ${languageName.toUpperCase()}. Decouple the script language from the Brand DNA's language and respect the interface language: ${languageName.toUpperCase()}.
    
    ${hook ? `CRITICAL: Every scenario MUST use this specific starting HOOK: "${hook}"` : ""}
    ${role ? `CRITICAL: Every scenario MUST be written in the ROLE/STANCE of: "${role}"` : ""}
    
    CRITICAL: Each block (1-4) MUST contain FULL, READY-TO-SPEAK TEXT. No placeholders. No "abstract theses". No descriptions of what to say. ONLY the final words the actor will dictate.
    
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

    Structure for EACH scenario (style):
    - style_name: controversial | edutainment | evergreen | trends | detective | napkin_explainer
    - matrix_pair: "Архетип Хука N + Payoff X"
    - hook: { visual: "...", screen_text: "...", words: "..." }
    - micro_payoff: { words: "..." }
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

  let text = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const promptToUse = attempt === 1 
        ? userPrompt 
        : `${userPrompt}\n\nCRITICAL RETRY: Output ONLY raw valid JSON matching the exact object structure requested. No markdown fences or preamble.`;
      
      const result = await targetModel.generateContent([systemPrompt, promptToUse]);
      const response = await result.response;
      const text = response.text().trim();

      const parsed = safeJsonParse(text);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
      console.warn(`[Gemini:generateScript] Attempt ${attempt} returned invalid JSON format. Raw snippet: "${text.slice(0, 250)}"`);
    } catch (e: any) {
      console.warn(`[Gemini:generateScript] Attempt ${attempt} exception: ${e?.message || e}`);
    }
    }

    throw new Error(
      locale === 'ru'
        ? '[Gemini:generateScript] Не удалось сформировать сценарий в формате JSON. Пожалуйста, повторите попытку.'
        : '[Gemini:generateScript] AI returned invalid script format. Please try again.'
    );
  }

export async function synthesizeDigitalShadow(rawInputs: any, locale: string = 'en') {
  const languageName = locale === 'ru' ? 'Russian' : 'English';
  
  const prompt = `
    You are an AI Persona Architect. Based on the onboarding data below, 
    generate a high-density "Digital Shadow DNA" (Master Prompt).
    
    CRITICAL: The resulting DNA description MUST be in the SAME LANGUAGE as the onboarding data provided.
    
    ONBOARDING DATA:
    ${JSON.stringify(rawInputs, null, 2)}
    
    GOAL: Create a personality profile that includes:
    1. Tone of voice (expert, ironic, minimalist, etc.)
    2. Area of expertise
    3. Core values and worldview
    4. Target audience resonance
    
    Output ONLY a clean, declarative paragraph that will serve as the system prompt for this user.
  `;

  try {
    const targetModel = getModel('fast', locale, 'text');
    const result = await targetModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    if (text) return text;
  } catch (err: any) {
    console.warn('[Gemini synthesizeDigitalShadow] AI call failed, generating smart fallback DNA:', err?.message || err);
  }

  // Fallback: Construct declarative DNA from rawInputs if Gemini API is unavailable or rate limited
  const inputsStr = typeof rawInputs === 'object' 
    ? Object.values(rawInputs).filter(Boolean).join('. ')
    : String(rawInputs);

  if (locale === 'ru') {
    return `Экспертный автор и контент-создатель. Ключевой фокус: ${inputsStr.slice(0, 250)}. Стиль: экспертный, лаконичный, ориентация на максимальную виральность и удержание аудитории.`;
  }
  return `Expert content creator and author. Key focus: ${inputsStr.slice(0, 250)}. Style: authoritative, concise, focused on maximum virality and audience retention.`;
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
    
    CRITICAL: Output in the same language as the raw data. Output as a bulleted list.
    
    RAW DATA:
    ${rawData}
  `;

  const textModel = getModel('fast', locale, 'text');
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
    - The resulting DNA description MUST BE IN THE SAME LANGUAGE as the source text.
    - Do not just append the new text. Synthesize it into a cohesive, consistent personality profile.
    - Ensure the final text is concise and powerful (max 400 words).
    
    EXISTING DNA:
    ${oldPersona}
    
    NEW UPDATES/EXAMPLES:
    ${newData}
    
    GOAL: Refine the tone, area of expertise, and worldview based on this new input.
    Output ONLY a clean, declarative paragraph.
  `;

  const textModel = getModel('fast', locale, 'text');
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
  locale: string = 'en',
  apiKey?: string,
  brandDna?: any,
  systemPromptBase?: string
) {
  if (IS_GROQ_OVERRIDE) {
    return groq.refineScript(currentScript, instruction, digitalShadow, locale, apiKey || process.env.GROQ_API_KEY, brandDna, systemPromptBase);
  }
  const targetModel = getModel('fast', locale, 'json', apiKey);

  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);

  const userPrompt = `
    EXISTING SCRIPT:
    ${JSON.stringify(currentScript, null, 2)}
    
    INSTRUCTION: "${instruction}"
    
    TASK: Refine the script based on the instruction. 
    Maintain Content Lego methodology and Brand DNA style.
    Output ONLY valid JSON in the same structure.
  `;

  let text = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const promptToUse = attempt === 1 
        ? userPrompt 
        : `${userPrompt}\n\nCRITICAL RETRY: Output ONLY raw valid JSON. Do not wrap in markdown or explanatory text.`;

      const result = await targetModel.generateContent([systemPrompt, promptToUse]);
      const response = await result.response;
      text = response.text().trim();

      const parsed = safeJsonParse(text);
      if (parsed && typeof parsed === 'object') return parsed;
      console.warn(`[Gemini:refineScript] Attempt ${attempt} returned invalid JSON structure. Raw snippet: "${text.slice(0, 250)}"`);
    } catch (e: any) {
      console.warn(`[Gemini:refineScript] Attempt ${attempt} exception: ${e?.message || e}. Raw snippet: "${text.slice(0, 250)}"`);
    }
  }

  throw new Error(
    locale === 'ru'
      ? '[Gemini:refineScript] Ошибка формата при редактировании сценария. Попробуйте еще раз.'
      : '[Gemini:refineScript] AI returned invalid data format during refinement.'
  );
}

export async function generateText(prompt: string, customApiKey?: string): Promise<string> {
  const targetModel = getModel('fast', 'en', 'text', customApiKey);
  const result = await targetModel.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

export async function generatePreviews(
  coreIdea: string,
  digitalShadow: string,
  locale: string = 'en',
  apiKey?: string,
  brandDna?: any,
  systemPromptBase?: string
) {
  const targetModel = getModel('fast', locale, 'json', apiKey);
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

  let text = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const promptToUse = attempt === 1 
        ? userPrompt 
        : `${userPrompt}\n\nCRITICAL RETRY: Output ONLY raw valid JSON object with the requested keys.`;

      const result = await targetModel.generateContent([systemPrompt, promptToUse]);
      const response = await result.response;
      text = response.text().trim();

      const parsed = safeJsonParse(text);
      if (parsed && typeof parsed === 'object') return parsed;
      console.warn(`[Gemini:generatePreviews] Attempt ${attempt} returned invalid JSON structure. Raw snippet: "${text.slice(0, 250)}"`);
    } catch (e: any) {
      console.warn(`[Gemini:generatePreviews] Attempt ${attempt} exception: ${e?.message || e}. Raw snippet: "${text.slice(0, 250)}"`);
    }
  }

  throw new Error(
    locale === 'ru'
      ? '[Gemini:generatePreviews] Ошибка формата превью сценария. Повторите попытку.'
      : '[Gemini:generatePreviews] AI returned invalid previews format. Please try again.'
  );
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
  const targetModel = getModel('fast', locale, 'json', apiKey);
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
    - edutainment: Turn viewer weakness into a superpower, use irony/metaphors.
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

  let text = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const promptToUse = attempt === 1 
        ? userPrompt 
        : `${userPrompt}\n\nCRITICAL RETRY: Output ONLY raw valid JSON object. No markdown fences or intro text.`;

      const result = await targetModel.generateContent([systemPrompt, promptToUse]);
      const response = await result.response;
      text = response.text().trim();

      const parsed = safeJsonParse(text);
      if (parsed && typeof parsed === 'object') return parsed;
      console.warn(`[Gemini:generateFullScript] Attempt ${attempt} returned invalid JSON structure. Raw snippet: "${text.slice(0, 250)}"`);
    } catch (e: any) {
      console.warn(`[Gemini:generateFullScript] Attempt ${attempt} exception: ${e?.message || e}. Raw snippet: "${text.slice(0, 250)}"`);
    }
  }

  throw new Error(
    locale === 'ru'
      ? '[Gemini:generateFullScript] Ошибка формата сценария. Попробуйте снова.'
      : '[Gemini:generateFullScript] AI returned invalid script format. Please try again.'
  );
}

export async function generateTurboScript(
  coreIdea: string,
  digitalShadow: string,
  locale: string = 'en',
  apiKey?: string,
  brandDna?: any,
  systemPromptBase?: string
) {
  const targetModel = getModel('fast', locale, 'json', apiKey);
  const systemPrompt = getSystemPrompt(digitalShadow, locale, brandDna, systemPromptBase);
  const languageName = locale === 'ru' ? 'Russian' : 'English';

  const userPrompt = `
    TASK: Execute 1-CLICK TURBO GENERATION for the following core idea.
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

  let text = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const promptToUse = attempt === 1 
        ? userPrompt 
        : `${userPrompt}\n\nCRITICAL RETRY: Output ONLY raw valid JSON object matching the requested schema.`;

      const result = await targetModel.generateContent([systemPrompt, promptToUse]);
      const response = await result.response;
      text = response.text().trim();

      const parsed = safeJsonParse(text);
      if (parsed && typeof parsed === 'object') return parsed;
      console.warn(`[Gemini:generateTurboScript] Attempt ${attempt} returned invalid JSON structure. Raw snippet: "${text.slice(0, 250)}"`);
    } catch (e: any) {
      console.warn(`[Gemini:generateTurboScript] Attempt ${attempt} exception: ${e?.message || e}. Raw snippet: "${text.slice(0, 250)}"`);
    }
  }

  // Smart Fallback: Construct high-converting script if Gemini raw JSON parse failed
  const cleanTitle = coreIdea.split('\n')[0].replace(/^\d+[\.\)]\s*/, '').trim();
  return {
    matrix_pair: "Архетип Хука 1 (Разрушение мифа) + Payoff A (Аха-момент)",
    selected_style: "edutainment",
    hook: {
      visual: "Эксперт смотрит в камеру в стильном студийном освещении",
      screen_text: cleanTitle.slice(0, 35),
      words: locale === 'ru'
        ? `Перестаньте делать это в 2026 году! Вот главный секрет: ${cleanTitle}`
        : `Stop doing this in 2026! Here is the main secret: ${cleanTitle}`
    },
    micro_payoff: {
      words: locale === 'ru'
        ? "Смысл в том, что 90% экспертов допускают одну и ту же ошибку при создании вирального контента."
        : "The thing is that 90% of experts make the exact same mistake when creating viral content."
    },
    body: {
      words: locale === 'ru'
        ? `Смотрите, ${coreIdea.replace(/\n/g, ' ')}. Исследования показывают, что именно этот фактор определяет удержание зрителей.`
        : `Look, ${coreIdea.replace(/\n/g, ' ')}. Studies show that this exact factor determines viewer retention.`
    },
    triz_inversion: {
      words: locale === 'ru'
        ? "НО неочевидная сторона в том, что результат дает не сложность монтажа, а выверенная структура и триггер упущенной выгоды."
        : "BUT the non-obvious reality is that results come from precise structure and FOMO triggers, not complex editing."
    },
    cta: {
      words: locale === 'ru'
        ? "Поэтому если хотите выстроить системные продажи из коротких видео — напишите слово СТУДИЯ в комментариях!"
        : "So if you want to build a system for converting short videos into clients, drop the word STUDIO in the comments!"
    },
    broll_prompt: "Cinematic 4k commercial camera movement, neon studio lights, high-end production",
    visual_hook: "High-end cinematic portrait of a confident content creator in a modern studio",
    social_post: `🚀 ${cleanTitle}\n\n#виральность #контент #продажи`
  };
}
