import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { storageService } from '../src/lib/services/storageService';

async function main() {
  console.log('Testing Cloudflare R2 upload configuration...');
  console.log('R2_ACCOUNT_ID:', process.env.R2_ACCOUNT_ID);
  console.log('R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME);
  console.log('R2_PUBLIC_DOMAIN:', process.env.R2_PUBLIC_DOMAIN);

  const testContent = `Cloudflare R2 test upload at ${new Date().toISOString()}`;
  const file = new File([Buffer.from(testContent)], 'test_r2_file.txt', { type: 'text/plain' });

  const url = await storageService.uploadFileDirect(file, 'test/r2_verify.txt', 'media');
  console.log('Upload Result URL:', url);

  if (url && url.includes('r2.dev')) {
    console.log('✅ SUCCESS! File uploaded successfully to Cloudflare R2!');
  } else if (url) {
    console.log('⚠️ Upload succeeded but fell back to Supabase:', url);
  } else {
    console.error('❌ Upload failed completely.');
  }
}

main().catch(console.error);
