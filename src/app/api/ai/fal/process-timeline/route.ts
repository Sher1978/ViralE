import { NextRequest, NextResponse } from 'next/server';
import { falService } from '@/lib/services/falService';
import { projectService } from '@/lib/services/projectService';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execPromise = promisify(exec);

/**
 * AI Video Orchestrator (Fal.ai + FFmpeg Edition)
 * Objective: Split, Animate, and Stitch segments into a multi-archetype video.
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, videoUrl, segments } = await req.json();

    if (!videoUrl || !segments || segments.length === 0) {
      return NextResponse.json({ error: 'Missing driving video or segments' }, { status: 400 });
    }

    console.log(`[FusionEngine] Starting orchestration for project ${projectId}`);
    console.log(`[FusionEngine] Total segments: ${segments.length}`);

    // PHASE 1: Parallel AI Processing
    const tmpDir = path.join('/tmp', `fusion-${uuidv4()}`);
    await fs.mkdir(tmpDir, { recursive: true });

    const processingResults = await Promise.all(segments.map(async (seg: any, idx: number) => {
      const segmentInputPath = path.join(tmpDir, `input_${idx}.mp4`);
      const segmentOutputPath = path.join(tmpDir, `output_${idx}.mp4`);

      // 1. Extract segment from original video using FFmpeg
      const duration = seg.endTime - seg.startTime;
      await execPromise(`ffmpeg -ss ${seg.startTime} -i ${videoUrl} -t ${duration} -c copy ${segmentInputPath}`);

      if (seg.avatarUrl) {
        console.log(`[FusionEngine] Segment ${idx}: Synthesizing with LivePortrait...`);
        // Note: In real flow, we'd upload segmentInputPath to a temp cloud storage first
        // so Fal.ai can access it. For now, assuming direct access if videoUrl is public.
        const result = await falService.animateAvatar(seg.avatarUrl, videoUrl); // Simplified
        return { ...seg, processedUrl: result.videoUrl, tempPath: null };
      }
      
      return { ...seg, processedUrl: videoUrl, tempPath: segmentInputPath };
    }));

    // PHASE 2: Stitching (The Stitcher)
    // Here we'd download all AI-generated segments and original parts, 
    // then use FFmpeg concat filter to bind them with the original audio.
    
    console.log(`[FusionEngine] Fusion logic ready. Next step: Final binding with audio_track.m4a`);

    return NextResponse.json({
      status: 'processing',
      taskId: uuidv4(),
      segments: processingResults
    });

  } catch (error: any) {
    console.error('[FusionEngine] Orchestration failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
