const apiKey = 'sk_V2_hgu_kSxaZhPZudu_IiTIu73pCiJoh4qBENfZfHpazm0vrd6y';
async function test() {
  const url = `https://upload.heygen.com/v1/asset`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'X-Api-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'image/jpeg',
      },
      body: Buffer.from('test')
    });
    const text = await res.text();
    console.log(url, res.status, text.substring(0,300));
  } catch(e) {
    console.log(url, 'FAILED', e.message);
  }
}
test();
