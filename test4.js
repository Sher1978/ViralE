const apiKey = 'sk_V2_hgu_kSxaZhPZudu_IiTIu73pCiJoh4qBENfZfHpazm0vrd6y';
async function test() {
  const url = `https://api.heygen.com/v1/talking_photo`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'X-Api-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'test' })
    });
    const text = await res.text();
    console.log(url, res.status, text.substring(0,300));
  } catch(e) {
    console.log(url, 'FAILED', e.message);
  }
}
test();
