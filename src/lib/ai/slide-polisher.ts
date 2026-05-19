import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export interface PolishedSlides {
  polished_hook: string;
  polished_cta: string;
}

export async function polishCriticalSlides(
  slide1Text: string,
  slide6Text: string,
  toneMode: 'expert' | 'mentor' | 'provocateur',
  ctaWord: string,
  locale: string = 'ru'
): Promise<PolishedSlides> {
  const language = locale === 'ru' ? 'Russian' : 'English';
  
  const fallback: PolishedSlides = {
    polished_hook: slide1Text,
    polished_cta: slide6Text,
  };

  if (!apiKey) return fallback;

  try {
    // Using gemini-3-flash-preview for high-fidelity creative copywriting
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: { 
        responseMimeType: 'application/json',
        temperature: 0.85,
      }
    });

    const systemPrompt = `
      You are an elite Instagram Copywriting Specialist. Your absolute mastery is writing punchy, scroll-stopping micro-copy.
      Your task is to refine and polish two critical slides of an Instagram Carousel to achieve maximum engagement in ${language}.
      
      TONE STYLE MODE: ${toneMode}
      - expert: ultra-authoritative, fact-driven, razor-sharp, zero filler words.
      - mentor: highly empathetic, supportive, relatable, "been in your shoes" warm hook.
      - provocateur: pattern-breaking, challenging, dramatic contrast, exposes common myths.

      CTA AUTOMATION WORD: "${ctaWord || 'trigger'}" (Make sure the CTA explicitly tells people to comment this exact word)

      SLIDES TO POLISH:
      - Raw Hook (Slide 1): "${slide1Text}" (Goal: Stop the scroll. Must be under 6-8 words, high impact)
      - Raw CTA (Slide 6): "${slide6Text}" (Goal: Frictionless automated lead generation using the comment trigger word)

      CRITICAL CONSTRAINTS:
      1. Write the polished outputs strictly in ${language}.
      2. Keep them incredibly concise (under 8-10 words per slide).
      3. Do NOT include decorative emoji inside the text, let the layout speak for itself.
      4. Make sure Slide 6 references the CTA word "${ctaWord}" clearly.

      OUTPUT JSON FORMAT:
      {
        "polished_hook": "The final refined Slide 1 text...",
        "polished_cta": "The final refined Slide 6 text..."
      }
    `;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text().trim();
    
    const parsed = JSON.parse(text);
    return {
      polished_hook: parsed.polished_hook || slide1Text,
      polished_cta: parsed.polished_cta || slide6Text,
    };
  } catch (err) {
    console.warn('[Slide Polisher Error] falling back to raw slides:', err);
    return fallback;
  }
}
