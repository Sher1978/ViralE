const apiKey = 'sk_V2_hgu_kSxaZhPZudu_IiTIu73pCiJoh4qBENfZfHpazm0vrd6y';
async function test() {
  const url = `https://api.heygen.com/v2/photo_avatar/avatar_group/create`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'X-Api-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Test Avatar', image_key: 'image/31b01fac77854c1298d2f7e89abd5c80/original.jpg' })
    });
    const text = await res.text();
    console.log(url, res.status, text.substring(0,300));
  } catch(e) {
    console.log(url, 'FAILED', e.message);
  }
}
test();
