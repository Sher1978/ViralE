import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const url = 'https://www.virale.uno/api/script/generate';
  // We need a session token or we can try to see if it allows anonymous if we can simulate one
  // Actually, without a valid JWT, it will return 401/403.
  // But we can check if the endpoint responds with the correct error (missingProjectId vs 401).
  
  console.log(`--- Testing Online API: ${url} ---`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coreIdea: 'Testing online deployment',
        locale: 'en',
        mode: 'initial'
      })
    });

    const status = response.status;
    const body = await response.json();
    
    console.log(`Status: ${status}`);
    console.log(`Body: ${JSON.stringify(body, null, 2)}`);

    if (status === 401 || status === 403) {
      console.log('Got Auth Error as expected (no token provided).');
    } else if (status === 400 && body.error === 'Missing projectId') {
      console.log('Endpoint is reachable and logic is running (auth check passed or skipped for now).');
    } else {
      console.log('Unexpected response from online API.');
    }
  } catch (err: any) {
    console.error('Fetch failed:', err.message);
  }
}

main();
