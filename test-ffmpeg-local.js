const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

let ffmpegPath = 'ffmpeg';
try {
  ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  console.log('Found ffmpeg-installer path:', ffmpegPath);
} catch (e) {
  console.log('ffmpeg-installer not found, using global ffmpeg');
}

const durSec = 4;
const projectDir = 'c:/Sher_AI_Studio/projects/ViralEngine';
const notebookPath = path.join(projectDir, 'public', 'assets', 'studio', 'notebook_bg.png');
const handPath = path.join(projectDir, 'public', 'assets', 'studio', 'drawing_hand.png');
const testSketchPath = path.join(projectDir, 'public', 'assets', 'studio', 'storyboard.png'); // Use storyboard as a real sketch for testing
const compositedImagePath = path.join(projectDir, 'test_composited.png');
const outPath = path.join(projectDir, 'test_out.mp4');

// Composite sketch on 1080x1920 scaled background using multiply blend
const compositeCmd = [
  `"${ffmpegPath}"`, '-y',
  '-i', `"${notebookPath}"`,
  '-i', `"${testSketchPath}"`,
  '-filter_complex', `"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=rgba[bg];[1:v]scale=840:1540:force_original_aspect_ratio=decrease,pad=840:1540:(ow-iw)/2:(oh-ih)/2:color=white,pad=1080:1920:120:190:color=white,format=rgba[sketch];[bg][sketch]blend=all_mode=multiply[out]"`,
  '-map', '[out]', '-frames:v', '1',
  `"${compositedImagePath}"`
].join(' ');

console.log('Running composite with blend=multiply...');

exec(compositeCmd, (err, stdout, stderr) => {
  if (err) {
    console.error('Composite failed:', stderr);
    return;
  }
  console.log('Composite success!');

  // Slide diagonal mask ending exactly at x=0, y=0 to prevent black erasure trails
  const filterComplex = [
    `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,loop=loop=-1:size=1:start=0,trim=duration=${durSec},setpts=PTS-STARTPTS,format=rgba[bg]`,
    `[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,loop=loop=-1:size=1:start=0,format=rgba[sketch_full]`,
    `[sketch_full]crop=840:1540:120:190,format=rgba[sketch_crop]`,
    
    // Direct time-dependent diagonal sweep mask on 840x1540 black canvas
    `color=c=black:s=840x1540,geq=lum='if(lt(X+Y,2380*(T/${durSec})),255,0)':cb=128:cr=128,format=rgba,trim=duration=${durSec}[mask]`,
    
    `[sketch_crop][mask]alphamerge[sketch_masked]`,
    `[bg][sketch_masked]overlay=120:190,format=rgba[paper_with_sketch]`,
    
    `[2:v]scale=1500:-1,format=rgba[hand_scaled]`,
    
    `[paper_with_sketch][hand_scaled]overlay=` +
      `x='clip(120 + 840*(t/${durSec}) + 140*cos(2*PI*1.5*t) + 30*sin(2*PI*10*t)\\, 120\\, 960) - 35':` +
      `y='clip(190 + 1540*(t/${durSec}) + 100*sin(2*PI*1.5*t) + 30*sin(2*PI*12*t)\\, 190\\, 1730) - 61'[out]`
  ].join(';');

  const inputs = [
    '-loop', '1', '-i', `"${notebookPath}"`,
    '-loop', '1', '-i', `"${compositedImagePath}"`,
    '-loop', '1', '-i', `"${handPath}"`
  ];

  const cmd = [
    `"${ffmpegPath}"`, '-y',
    ...inputs,
    '-filter_complex', `"${filterComplex}"`,
    '-map', '[out]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-level', '4.0', '-crf', '22',
    '-t', String(durSec),
    '-r', '30',
    `"${outPath}"`
  ].join(' ');

  console.log('Running drawing video command with corrected mask overlay path...');

  exec(cmd, (err2, stdout2, stderr2) => {
    if (err2) {
      console.error('Drawing video failed:', stderr2);
    } else {
      console.log('Success! Output saved to:', outPath);
    }
  });
});
