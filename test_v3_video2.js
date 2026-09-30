const apiKey = 'sk_V2_hgu_kSxaZhPZudu_IiTIu73pCiJoh4qBENfZfHpazm0vrd6y';
async function test() {
  const url = `https://api.heygen.com/v3/videos`;
  try {
    const payload = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: 'e837ef760c234fbd9fff74a549b1d6d2'
          },
          voice: {
            type: 'text',
            input_text: 'Test',
            voice_id: '1bd001e7e50f421d891986aad5158bc8'
          }
        }
      ]
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log(url, res.status, text.substring(0,300));
  } catch(e) {
    console.log(url, 'FAILED', e.message);
  }
}
test();
