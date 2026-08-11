const LATE_DEV_API_KEY = process.env.LATE_DEV_API_KEY || 'sk_778b433174e40f81e28ccc7231273d50bf37eac4ac979a8bfe7cae60947a0e3c';

async function testLateDevEndpoints() {
  console.log('Testing Late.dev API Key:', LATE_DEV_API_KEY.slice(0, 10) + '...');

  const endpoints = [
    'https://late.dev/api/v1/accounts',
    'https://late.dev/api/v1/posts',
    'https://late.dev/api/v1/me',
    'https://getlate.dev/api/v1/accounts',
    'https://api.late.dev/v1/posts'
  ];

  for (const ep of endpoints) {
    try {
      console.log(`Checking ${ep}...`);
      const res = await fetch(ep, {
        headers: {
          'Authorization': `Bearer ${LATE_DEV_API_KEY}`
        }
      });
      console.log(`Status for ${ep}: ${res.status} ${res.statusText}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`Data from ${ep}:`, JSON.stringify(data, null, 2));
      } else {
        const text = await res.text();
        console.log(`Response body from ${ep}:`, text.slice(0, 300));
      }
    } catch (e: any) {
      console.error(`Error checking ${ep}:`, e.message);
    }
  }
}

testLateDevEndpoints();
