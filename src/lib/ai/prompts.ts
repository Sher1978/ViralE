import { model } from './gemini';

/**
 * Generates a high-quality image generation prompt based on a simple user description.
 * Optimized for avatar animation (portrait, neutral expression, high detail).
 */
export async function generateAvatarPrompt(description: string, locale: string = 'en') {
  const languageName = locale === 'ru' ? 'Russian' : 'English';
  
  const systemPrompt = `
    You are a professional Prompt Engineer for high-end AI image generators (Midjourney, Grok, Flux).
    Your goal is to transform a simple character description into a hyper-detailed, cinematic portrait prompt.
    
    CRITICAL REQUIREMENTS for the resulting prompt:
    1. Framing: 3/4 portrait or close-up. 
    2. Expression: Neutral or subtle (crucial for facial animation/lipsync).
    3. Lighting: Cinematic, soft directional light, high contrast but balanced skin tones.
    4. Style: Photorealistic, high skin texture detail, eye catchlights.
    
    OUTPUT SPECIFICATIONS:
    - The final expanded prompt MUST BE IN ENGLISH (as most image generators work best with English).
    - Provide ONLY the prompt text, no labels like "Prompt:" or "Generated:".
    - Avoid buzzwords like "4k" or "8k" - use descriptive language instead ("macro texture", "shallow depth of field").
  `;

  const userPrompt = `
    User Idea in ${languageName}: "${description}"
    Generate a 100-word expert prompt for this character.
  `;

  try {
    // Note: We use the existing gemini model. 
    // If it's configured for JSON response, we might need to handle it or use a text-only instance.
    // Based on gemini.ts, 'model' is configured for JSON. 
    // I'll use a local instance for pure text if needed, or wrap in JSON.
    
    const prompt = `
      ${systemPrompt}
      
      ACTUAL TASK:
      ${userPrompt}
      
      Return the result as a JSON object: { "expanded_prompt": "..." }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Clean potential markdown code blocks
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
    const data = JSON.parse(jsonStr);
    
    return data.expanded_prompt;
  } catch (error) {
    console.error('Error generating avatar prompt:', error);
    throw new Error('Failed to generate prompt. Please try again.');
  }
}
