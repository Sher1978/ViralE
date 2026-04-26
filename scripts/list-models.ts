import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";

async function listModels() {
  if (!apiKey) {
    console.error("❌ API Key is missing");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    // We use v1 endpoint to list models
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.models) {
      console.log("✅ Available Models for your key:");
      data.models.forEach((m: any) => {
        console.log(`- ${m.name} (Supports: ${m.supportedGenerationMethods.join(", ")})`);
      });
    } else {
      console.log("❌ No models found or error in response:", data);
    }
  } catch (err) {
    console.error("❌ Failed to list models:", err);
  }
}

listModels();
