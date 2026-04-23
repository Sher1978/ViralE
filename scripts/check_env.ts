import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ NO API KEY FOUND IN ENV');
} else {
  console.log(`✅ API KEY FOUND (starts with ${apiKey.substring(0, 7)}...)`);
  console.log(`Length: ${apiKey.length}`);
}
