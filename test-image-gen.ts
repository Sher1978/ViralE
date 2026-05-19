import { config } from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY;

async function testRunware() {
  if (!RUNWARE_API_KEY) return;
  console.log("\nTesting Runware Image Gen with width=768 and height=960 (4:5)...");
  try {
    const payload = [
      { taskType: 'authentication', apiKey: RUNWARE_API_KEY },
      {
        taskType: 'imageInference',
        taskUUID: uuidv4(),
        positivePrompt: "A sleek luxury neon car, cyberpunk style, high-end 3D render",
        width: 768,
        height: 960,
        model: 'runware:100@1', // FLUX.1 [schnell]
        numberResults: 1,
        outputFormat: 'webp'
      }
    ];

    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("Runware Response Status:", response.status);
    console.log("Runware Response Data:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Runware test error:", err.message);
  }
}

testRunware();
