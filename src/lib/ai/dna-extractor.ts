import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export interface DistilledDnaProfile {
  signature_phrases: string[];
  audience_pain_words: string[];
  forbidden_words: string[];
}

export async function extractSignaturePhrases(
  dnaPrompt: string,
  knowledgeBaseJson: any,
  locale: string = 'ru'
): Promise<DistilledDnaProfile> {
  const language = locale === 'ru' ? 'Russian' : 'English';
  
  const fallbackProfile: DistilledDnaProfile = {
    signature_phrases: locale === 'ru' 
      ? ['вот в чем дело', 'давайте начистоту', 'как бы там ни было', 'важный нюанс']
      : ['here is the catch', 'let\'s be honest', 'at the end of the day', 'crucial takeaway'],
    audience_pain_words: locale === 'ru'
      ? ['слив бюджета', 'выгорание', 'нет просмотров', 'каша в голове', 'клиенты уходят']
      : ['wasted budget', 'burnout', 'zero views', 'confusion', 'losing clients'],
    forbidden_words: locale === 'ru'
      ? ['успешный успех', 'инфоцыганство', 'волшебная таблетка']
      : ['magic pill', 'guaranteed millions', 'get rich quick'],
  };

  if (!apiKey) {
    return fallbackProfile;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const systemPrompt = `
      You are an expert linguistics profile analyzer inside the ViralE suite.
      Your goal is to parse the user's digital shadow DNA profile and distill exact semantic voice tokens in ${language}.
      
      USER_DNA_PROMPT:
      ${dnaPrompt}
      
      USER_STRUCTURED_DNA:
      ${JSON.stringify(knowledgeBaseJson || {})}

      INSTRUCTIONS:
      1. Extract 4-6 signature phrases ("signature_phrases") that the user likely uses based on their profile.
      2. Extract 4-6 audience pain words ("audience_pain_words") the user would use to describe frustrations.
      3. Extract 3-4 forbidden corporate/cliché buzzwords ("forbidden_words") the user explicitly avoids.
      4. Ensure all extracted items are written entirely in ${language}.

      OUTPUT JSON FORMAT:
      {
        "signature_phrases": ["phrase1", "phrase2", ...],
        "audience_pain_words": ["pain1", "pain2", ...],
        "forbidden_words": ["word1", "word2", ...]
      }
    `;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text().trim();
    
    const parsed = JSON.parse(text);
    return {
      signature_phrases: Array.isArray(parsed.signature_phrases) ? parsed.signature_phrases : fallbackProfile.signature_phrases,
      audience_pain_words: Array.isArray(parsed.audience_pain_words) ? parsed.audience_pain_words : fallbackProfile.audience_pain_words,
      forbidden_words: Array.isArray(parsed.forbidden_words) ? parsed.forbidden_words : fallbackProfile.forbidden_words,
    };
  } catch (err) {
    console.error('[DNA Extractor Error]:', err);
    return fallbackProfile;
  }
}
