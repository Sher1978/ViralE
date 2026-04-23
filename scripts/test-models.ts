import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";

async function listModels() {
  console.log('Using API Key starts with:', apiKey.substring(0, 5) + '...');
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const models = await genAI.listModels();
    console.log('Available Models:');
    // @ts-ignore
    models.models.forEach(m => {
        console.log(`- ${m.name} (${m.displayName})`);
    });
  } catch (err: any) {
    console.error('Error listing models:', err.message);
  }
}

listModels();
