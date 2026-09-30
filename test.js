const apiKey = 'sk_V2_hgu_kSxaZhPZudu_IiTIu73pCiJoh4qBENfZfHpazm0vrd6y';
async function test() {
  const tryFetch = async (url) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'X-Api-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ file_type: 'jpg' })
    });
    const text = await res.text();
    console.log(url, res.status, text.substring(0,100));
  };
  await tryFetch('https://api.heygen.com/v2/talking_photo/upload');
  await tryFetch('https://api.heygen.com/v1/talking_photo/upload_url');
}
test();
