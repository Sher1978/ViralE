import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";

async function listModelsFetch() {
  console.log('Fetching models from Google API...');
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
       console.error('API Error:', data.error);
       return;
    }

    console.log('Available Models:');
    // @ts-ignore
    data.models.forEach(m => {
        console.log(`- ${m.name} (${m.displayName}) - Methods: ${m.supportedGenerationMethods.join(', ')}`);
    });
  } catch (err: any) {
    console.error('Fetch Error:', err.message);
  }
}

listModelsFetch();
