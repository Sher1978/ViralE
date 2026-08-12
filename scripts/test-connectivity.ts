import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

async function testConnectivity() {
  const modelsToTest = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite", "gemini-2.5-flash"];
  
  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say "OK"');
      const response = await result.response;
      console.log(`✅ ${modelName} works: ${response.text().trim()}`);
      break; // Success!
    } catch (err: any) {
      console.error(`❌ ${modelName} failed: ${err.message}`);
    }
  }
}

testConnectivity();
