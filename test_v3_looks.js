const apiKey = 'sk_V2_hgu_kSxaZhPZudu_IiTIu73pCiJoh4qBENfZfHpazm0vrd6y';
async function test() {
  const url = `https://api.heygen.com/v3/avatars/looks?limit=100`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 
        'X-Api-Key': apiKey,
        'Accept': 'application/json',
      }
    });
    const text = await res.text();
    console.log(url, res.status, text.substring(0,300));
    const json = JSON.parse(text);
    console.log('Returned looks:', json.data?.length);
  } catch(e) {
    console.log(url, 'FAILED', e.message);
  }
}
test();
