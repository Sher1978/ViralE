import { GoogleGenerativeAI } from "@google/generative-ai";
import * as groq from "./groq";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// [REVERSIBLE OVERRIDE] Set to true to route all Gemini calls to Groq
const IS_GROQ_OVERRIDE = process.env.OVERRIDE_GEMINI_WITH_GROQ === 'true';

export const FAST_MODEL = "gemini-2.5-flash-lite";
export const PRO_MODEL = "gemini-1.5-pro";

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

  const baseModelName = tier === 'fast' ? FAST_MODEL : PRO_MODEL;
  const client = apiKey ? new GoogleGenerativeAI(apiKey) : genAI;
  
  // List of fallback models to try if the main model experiences 503 or overload
  const fallbackModels = [
    baseModelName,
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash",
    "gemini-2.5-flash",
    "gemini-1.5-pro",
  ];

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
    Based on this idea: "${coreIdea}", generate 6 distinct viral video scripts (scenarios) based on the CONTENT LEGO methodology.
    
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
    6. napkin_explainer (Napkin Explainer): Whiteboard animation scenario. Must build on spatial/physical world metaphors (labyrinths, levers, scales, bridges, tents). Slow-paced, hypnotizing rhythm. Starts with a visual thought experiment ("Imagine..."), and decomposes the solution strictly into 3 numbered simple components.

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

  const result = await targetModel.generateContent([systemPrompt, userPrompt]);
  const response = await result.response;
  let text = response.text().trim();
  
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      text = text.substring(jsonStart, jsonEnd + 1);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error('[Gemini] JSON Parse Error. Raw Text:', text);
    throw new Error('AI returned invalid data format. Please try again.');
  }
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

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
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

  const textModelName = process.env.GEMINI_MODEL || FAST_MODEL;
  const textModel = genAI.getGenerativeModel({ model: textModelName });
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

  // Note: For this one we don't need JSON response, just text
  const textModelName = process.env.GEMINI_MODEL || FAST_MODEL;
  const textModel = genAI.getGenerativeModel({ model: textModelName });
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

  const result = await targetModel.generateContent([systemPrompt, userPrompt]);
  const response = await result.response;
  let text = response.text().trim();
  
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      text = text.substring(jsonStart, jsonEnd + 1);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error('[Gemini] JSON Refinement Parse Error. Raw Text:', text);
    throw new Error('AI returned invalid data format during refinement.');
  }
}

export async function generateText(prompt: string, customApiKey?: string): Promise<string> {
  const targetModel = getModel('fast', 'en', 'text', customApiKey);
  const result = await targetModel.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}
