import os
import json
import requests
import subprocess
import tempfile
import time
from pathlib import Path
from dotenv import load_dotenv

# Load credentials from .env.local
load_dotenv(".env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

def get_pending_jobs():
    """Fetch pro render jobs with assembly manifest"""
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    url = f"{SUPABASE_URL}/rest/v1/render_jobs?status=eq.pending&render_type=eq.pro"
    response = requests.get(url, headers=headers)
    return response.json()

def update_job_status(job_id, status, output_url=None, error=None):
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}
    payload = {"status": status}
    if output_url: payload["output_url"] = output_url
    if error: payload["error_log"] = error
    if status == "completed": payload["progress"] = 100
    
    url = f"{SUPABASE_URL}/rest/v1/render_jobs?id=eq.{job_id}"
    requests.patch(url, headers=headers, json=payload)

def send_telegram(chat_id, video_url, message):
    if not TELEGRAM_TOKEN or not chat_id:
        print("Telegram configuration missing.")
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendVideo"
    payload = {
        "chat_id": chat_id,
        "video": video_url,
        "caption": message,
        "supports_streaming": True
    }
    try:
        r = requests.post(url, json=payload)
        print(f"Telegram notification sent: {r.status_code}")
    except Exception as e:
        print(f"Telegram failed: {e}")

def assemble_video(job):
    job_id = job["id"]
    manifest = job.get("config_json", {}).get("manifest", {})
    segments = manifest.get("segments", [])
    
    if not segments:
        print(f"No segments in job {job_id}")
        return

    update_job_status(job_id, "processing")
    
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        processed_clips = []
        
        # 1. Process Each Segment
        for i, seg in enumerate(segments):
            asset_url = seg.get("assetUrl")
            overlay_url = seg.get("overlayBroll")
            
            if not asset_url:
                print(f"Warning: Segment {i} missing assetUrl, skipping.")
                continue
            
            # Download main asset
            base_file = tmp_path / f"base_{i}.mp4"
            r = requests.get(asset_url)
            with open(base_file, "wb") as f: f.write(r.content)
            
            final_clip_for_seg = base_file
            
            # If there's an overlay (B-Roll)
            if overlay_url:
                overlay_file = tmp_path / f"overlay_{i}.mp4"
                r = requests.get(overlay_url)
                with open(overlay_file, "wb") as f: f.write(r.content)
                
                # Composite using FFmpeg (Overlay middle 50% opacity or similar)
                composited_file = tmp_path / f"comp_{i}.mp4"
                cmd = [
                    "ffmpeg", "-y", "-i", str(base_file), "-i", str(overlay_file),
                    "-filter_complex", "[1:v]scale=1080:-1,format=yuva420p,colorchannelmixer=aa=0.5[ovrl];[0:v][ovrl]overlay=x=0:y=0",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", str(composited_file)
                ]
                subprocess.run(cmd, capture_output=True)
                final_clip_for_seg = composited_file

            processed_clips.append(final_clip_for_seg)

        if not processed_clips:
            update_job_status(job_id, "failed", error="No clips processed successfully")
            return

        # 2. Concat all clips
        concat_list = tmp_path / "list.txt"
        with open(concat_list, "w") as f:
            for clip in processed_clips:
                # FFmpeg concat requires absolute paths or safe names
                f.write(f"file '{clip.absolute()}'\n")

        output_file = tmp_path / "final_production.mp4"
        # We re-encode to ensure consistent metadata and streaming support
        cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", str(concat_list),
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(output_file)
        ]
        
        print(f"Assembling final video...")
        result = subprocess.run(cmd, capture_output=True)
        
        if result.returncode != 0:
            err = result.stderr.decode()
            print(f"FFmpeg failed: {err}")
            update_job_status(job_id, "failed", error=err)
            return

        # 3. Finalization logic
        # Note: In a production environment, you would upload this file to Supabase Storage
        # For now, we simulate the completion and use the local path if the worker is on the same machine
        # or use a pre-determined URL pattern.
        
        # mock_final_url: You should implement actual upload to Supabase Storage here
        final_url = f"https://your-domain.com/renders/{job_id}.mp4" 
        
        update_job_status(job_id, "completed", output_url=final_url)
        
        # chat_id from project or user metadata
        chat_id = job.get("config_json", {}).get("telegram_chat_id") or os.getenv("DEFAULT_TELEGRAM_CHAT_ID")
        send_telegram(chat_id, final_url, "✅ *Production Complete!* \n\nYour video is ready for distribution.")

if __name__ == "__main__":
    print("🚀 Viral Engine Assembly Worker Started...")
    while True:
        jobs = get_pending_jobs()
        for job in jobs:
            print(f"Processing Job: {job['id']}")
            try:
                assemble_video(job)
            except Exception as e:
                print(f"Critical error on job {job['id']}: {e}")
                update_job_status(job['id'], "failed", error=str(e))
        
        time.sleep(10) # Poll every 10s
