import { getFFmpeg, getFetchFile } from './ffmpeg-delivery';

export const compressVideoClient = async (
  videoBlob: Blob, 
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ff = await getFFmpeg();
  
  ff.on('progress', ({ progress }: any) => {
    if (onProgress) onProgress(Math.round(progress * 100));
  });

  const inputName = 'input.mp4';
  const outputName = 'output.mp4';

  const fetchFile = await getFetchFile();
  await ff.writeFile(inputName, await fetchFile(videoBlob));

  // Compress to 720p, max 30 fps. Do NOT crop the face.
  // Using veryfast preset for client side speed.
  await ff.exec([
    '-i', inputName,
    '-vf', 'scale=-2:720,fps=30',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '28',
    '-c:a', 'aac',
    '-b:a', '128k',
    outputName
  ]);

  const data = await ff.readFile(outputName);
  return new Blob([data as any], { type: 'video/mp4' });
};
