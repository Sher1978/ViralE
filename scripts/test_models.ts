import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-1.5-pro-latest", "gemini-pro"];
    
    console.log('Testing models...');
    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('ping');
        const response = await result.response;
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
