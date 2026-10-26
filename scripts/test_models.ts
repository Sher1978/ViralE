import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

async function listModels() {
  try {
    const models = [
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.1-pro-preview'
    ];
    
    console.log('Testing models...');
    for (const modelName of models) {
      try {
        const result = await ai.models.generateContent({
          model: modelName,
          contents: 'ping'
        });
        console.log(`✅ ${modelName}: OK`);
      } catch (err: any) {
        console.log(`❌ ${modelName}: ${err.message}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

listModels();
