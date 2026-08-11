import { publishToSocialPlatforms } from '../src/lib/services/socialPostingService';

async function testSocialPosting() {
  console.log('==================================================');
  console.log('🧪 TESTING LATE.DEV SOCIAL POSTING API KEY');
  console.log('==================================================');

  const apiKey = process.env.LATE_DEV_API_KEY || process.env.SOCIAL_POSTING_API_KEY;
  console.log('🔑 LATE_DEV_API_KEY:', apiKey ? `${apiKey.slice(0, 8)}...` : '❌ Missing');

  const result = await publishToSocialPlatforms({
    projectId: 'test_proj_123',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-vertical-portrait-of-a-woman-40228-large.mp4',
    title: 'Тестовый виральный ролик Virali AI',
    caption: 'Автоматический деплой и публикация ролика #shorts #reels #viral',
    platforms: ['youtube', 'instagram', 'tiktok', 'telegram']
  });

  console.log('📊 RESULTS:', JSON.stringify(result, null, 2));
}

testSocialPosting();
