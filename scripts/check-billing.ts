
import { GoogleGenerativeAI } from "@google/generative-ai";

async function checkElevenLabs() {
  const apiKey = "sk_b9fb317eb2075fc233c74116b8760492354ad7385a1b22de";
  console.log("Checking ElevenLabs balance...");
  
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": apiKey }
    });
    
    if (!res.ok) {
      console.error("ElevenLabs API error:", res.status, await res.text());
      return;
    }
    
    const data = await res.json();
    console.log("Subscription Info:");
    console.log(`Character Count: ${data.character_count}`);
    console.log(`Character Limit: ${data.character_limit}`);
    console.log(`Tier: ${data.tier}`);
    
    const remaining = data.character_limit - data.character_count;
    console.log(`Remaining: ${remaining}`);
    
    if (remaining <= 0) {
      console.log("!!! BALANCE DEPLETED !!!");
    }
  } catch (e) {
    console.error("Failed to check ElevenLabs:", e);
  }
}

checkElevenLabs();
