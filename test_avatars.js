const apiKey = 'sk_V2_hgu_kSxaZhPZudu_IiTIu73pCiJoh4qBENfZfHpazm0vrd6y';
async function test() {
  const res = await fetch('https://api.heygen.com/v2/avatars', {
    headers: { 'x-api-key': apiKey, 'Accept': 'application/json' }
  });
  const data = await res.json();
  console.log('avatars[0]:', data.data.avatars[0]);
  console.log('talking_photos[0]:', data.data.talking_photos[0]);
}
test();
