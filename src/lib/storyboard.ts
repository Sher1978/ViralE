import { model } from './ai/gemini';

export interface StoryboardFrame {
  scene_id: number;
  visual_prompt: string;
  action_description: string;
}

export async function generateStoryboardAI(script: any, locale: string = 'en') {
  const languageName = locale === 'ru' ? 'Russian' : 'English';
  
  const prompt = `
    You are the "Viral Engine" Visual Director. 
    Transform the follow video script into a set of high-fidelity visual instructions.
    
    SCRIPT:
    ${JSON.stringify(script, null, 2)}
    
    INSTRUCTIONS:
    1. For each scene in the script, provide:
       - "visual_prompt": Optimized for image/video AI generation (MUST BE IN ENGLISH even if locale is Russian).
       - "action_description": What is physically happening (MUST BE IN ${languageName.toUpperCase()}).
    2. Style: Premium, Cinematic, iOS 26 Aesthetic, Deep Black background, Neo-Glassmorphism.
    3. Lighting: High contrast, neon accents.
    
    OUTPUT FORMAT: JSON array of frames
    [
      {
        "scene_id": 1,
        "visual_prompt": "Cinematic close-up of a person thinking, neon mint glow, bokeh background, 4k",
        "action_description": "User is looking intently at the phone"
      }
    ]
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text().trim();
  
  // Clean potential markdown code blocks
  const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
  return JSON.parse(jsonStr);
}
