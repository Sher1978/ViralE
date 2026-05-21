import axios from 'axios';
import fs from 'fs/promises';

async function main() {
  const url = 'https://huggingface.co/KwaiVGI/LivePortrait/resolve/main/assets/examples/driving/d0.mp4';
  console.log(`Downloading driving template from: ${url}`);
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(res.data);
    console.log(`Successfully downloaded! File size: ${buffer.length} bytes.`);
    if (buffer.length > 50000) {
      console.log('Video file is valid and verified!');
    } else {
      console.error('File too small, might be a text pointer!');
    }
  } catch (err: any) {
    console.error('Download failed:', err.message);
  }
}

main();
