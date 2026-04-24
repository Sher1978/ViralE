import { NextResponse } from 'next/server';

// Curated high-quality Mixkit & Giphy resources mapped to emotions
const EMOTION_ASSETS: Record<string, any[]> = {
  happy: [
    { name: 'Sunlight Flare', url: 'https://mixkit.imgix.net/videos/preview/mixkit-sun-shining-through-tree-branches-3180-preview.mp4', source: 'mixkit' },
    { name: 'Joyful Crowd', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJndXp4NjZ4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l0MYK5UBwA0CZjt4s/giphy.mp4', source: 'giphy' }
  ],
  intense: [
    { name: 'Fire Sparks', url: 'https://mixkit.imgix.net/videos/preview/mixkit-fire-sparks-and-flames-in-the-dark-4241-preview.mp4', source: 'mixkit' },
    { name: 'Speed Blur', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJndXp4NjZ4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKVUn7iM8FMEU24/giphy.mp4', source: 'giphy' }
  ],
  dramatic: [
    { name: 'Thunderstorm', url: 'https://mixkit.imgix.net/videos/preview/mixkit-thunderstorm-with-lightning-in-the-sky-4034-preview.mp4', source: 'mixkit' },
    { name: 'Crying Silhouette', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJndXp4NjZ4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/26ufcVAp3AiJJsrIs/giphy.mp4', source: 'giphy' }
  ],
  tech: [
    { name: 'Code Flow', url: 'https://mixkit.imgix.net/videos/preview/mixkit-abstract-digital-technology-background-2089-preview.mp4', source: 'mixkit' },
    { name: 'Cyber Grid', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJndXp4NjZ4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4Z3Z4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMGpx4Z5VN1FYY/giphy.mp4', source: 'giphy' }
  ]
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mood = searchParams.get('mood') || 'tech';
  
  // Logic: Giphy first, then Mixkit
  const pool = EMOTION_ASSETS[mood] || EMOTION_ASSETS['tech'];
  
  const giphyAssets = pool.filter(a => a.source === 'giphy');
  const mixkitAssets = pool.filter(a => a.source === 'mixkit');
  
  const sortedAssets = [...giphyAssets, ...mixkitAssets].map((a, idx) => ({
    ...a,
    id: `${mood}-${idx}`,
    type: 'video/mp4',
    tags: [mood, a.source]
  }));

  return NextResponse.json({
    success: true,
    assets: sortedAssets
  });
}
