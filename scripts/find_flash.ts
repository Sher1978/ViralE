import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";

async function findBestFlashModel() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (!data.models) {
      console.log('No models found. Key issue?');
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    console.log('Available models containing "flash":');
    const flashModels = data.models
      .filter((m: any) => m.name.toLowerCase().includes('flash'))
      .map((m: any) => m.name);
    
    console.log(JSON.stringify(flashModels, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

findBestFlashModel();
