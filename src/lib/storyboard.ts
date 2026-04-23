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

export async function refineSceneAI(script: any, sceneIndex: number, currentScenes: any[], instruction: string, locale: string = 'en') {
  const languageName = locale === 'ru' ? 'Russian' : 'English';
  
  const prompt = `
    You are the "Viral Engine" Visual Director.
    We are refining ONE SPECIFIC FRAME for our video.
    
    FULL SCRIPT:
    ${JSON.stringify(script, null, 2)}
    
    CURRENT SCENES:
    ${JSON.stringify(currentScenes, null, 2)}
    
    REFINING SCENE INDEX: ${sceneIndex}
    INSTRUCTION: ${instruction}
    
    TASK:
    Update the "visual_prompt" and "action_description" for THIS SCENE ONLY based on the instruction.
    Ensure "visual_prompt" is in ENGLISH and "action_description" is in ${languageName.toUpperCase()}.
    
    OUTPUT FORMAT: Return only the updated JSON object for this scene.
    {
      "scene_id": ${sceneIndex + 1},
      "visual_prompt": "...",
      "action_description": "..."
    }
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text().trim();
  const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
  return JSON.parse(jsonStr);
}
