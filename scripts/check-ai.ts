import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import path from "path";

// Load .env from root
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const modelName = process.env.GEMINI_MODEL || "gemini-2.5-pro";

async function checkAI() {
  console.log("🚀 Starting Gemini API Health Check...");
  console.log(`📍 Model: ${modelName}`);
  console.log(`🔑 API Key: ${apiKey ? "PRESENT (ends with " + apiKey.slice(-4) + ")" : "MISSING"}`);

  if (!apiKey) {
    console.error("❌ ERROR: API Key is not set in .env.local");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const start = Date.now();
    const result = await model.generateContent("Say 'AI is Online' if you can read this.");
    const response = await result.response;
    const text = response.text();
    const duration = Date.now() - start;

    if (text) {
      console.log("\n✅ SUCCESS! AI responded correctly.");
      console.log(`⏱️  Latency: ${duration}ms`);
      console.log(`🤖 Response: "${text.trim()}"`);
    } else {
      console.warn("\n⚠️  WARNING: AI responded but the text was empty.");
    }
  } catch (error: any) {
    console.log("\n❌ API ERROR DETECTED!");
    
    if (error.message?.includes("404")) {
      console.error("👉 Error 404: The model name is likely wrong or the region is not supported for this model.");
      console.error("Suggestion: Try 'gemini-pro' or 'gemini-1.5-flash'.");
    } else if (error.message?.includes("401") || error.message?.includes("403")) {
      console.error("👉 Error 401/403: API Key is invalid or restricted.");
    } else if (error.message?.includes("429")) {
      console.error("👉 Error 429: Rate limit exceeded or quota exhausted.");
    } else {
      console.error(`👉 Details: ${error.message}`);
    }
    
    process.exit(1);
  }
}

checkAI();
