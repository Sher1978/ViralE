const PEXELS_KEY = 'PMBSlE46eRB8wCZ0ECUWs6O0FbhNjA8xSyu5DJzqmGPFSj4bSwofPTm';

async function testPexels() {
  try {
    const res = await fetch(`https://api.pexels.com/videos/search?query=nature&per_page=1`, {
      headers: { 'Authorization': PEXELS_KEY }
    });
    const data = await res.json();
    console.log('Pexels Test Success:', data.videos?.length > 0 ? 'Found videos!' : 'No videos found.');
    if (data.videos?.length > 0) {
      console.log('Sample Video URL:', data.videos[0].video_files[0].link);
    }
  } catch (e) {
    console.error('Pexels Test Failed:', e.message);
  }
}

testPexels();
