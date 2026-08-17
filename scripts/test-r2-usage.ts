import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkR2Usage() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || 'virale';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error('R2 Credentials missing.');
    return;
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey }
  });

  let totalBytes = 0;
  let fileCount = 0;
  let isTruncated = true;
  let continuationToken: string | undefined;

  while (isTruncated) {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: bucketName,
      ContinuationToken: continuationToken
    }));

    if (res.Contents) {
      for (const obj of res.Contents) {
        totalBytes += obj.Size || 0;
        fileCount++;
      }
    }

    isTruncated = !!res.IsTruncated;
    continuationToken = res.NextContinuationToken;
  }

  const totalGB = totalBytes / (1024 * 1024 * 1024);
  console.log(`Cloudflare R2 Bucket [${bucketName}]:`);
  console.log(`- Total Files: ${fileCount}`);
  console.log(`- Total Size: ${totalBytes.toLocaleString()} bytes (${totalGB.toFixed(4)} GB)`);
  console.log(`- 5 GB Threshold Reached: ${totalGB >= 5 ? '⚠️ YES' : '✅ NO'}`);
}

checkR2Usage().catch(console.error);
