import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

async function testConnectivity() {
  const modelsToTest = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];
  
  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing model: ${modelName}...`);
      const result = await ai.models.generateContent({
        model: modelName,
        contents: 'Say "OK"'
      });
      console.log(`✅ ${modelName} works: ${(result.text || '').trim()}`);
      break; // Success!
    } catch (err: any) {
      console.error(`❌ ${modelName} failed: ${err.message}`);
    }
  }
}

testConnectivity();
