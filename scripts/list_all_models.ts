import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

async function listAllModels() {
  try {
    // There is no listModels on GoogleGenerativeAI class in @google/generative-ai
    // It's usually part of the REST API or different client.
    // However, we can try to use the fetch API directly.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

listAllModels();
