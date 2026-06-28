import cv2
import numpy as np
import os
import sys
import subprocess
import tempfile
import shutil

class ViralSketchEngine:
    def __init__(self, hand_image_path=None):
        """
        Initialize the whiteboard sketch animation engine.
        :param hand_image_path: Path to the transparent PNG of a drawing hand holding a marker.
        """
        self.hand_image_path = hand_image_path or "public/assets/studio/drawing_hand.png"
        self.hand_img = None
        self.marker_tip_offset = (0, 0) # Offset of marker tip from top-left of hand image
        
        self._load_hand_asset()

    def _load_hand_asset(self):
        """Loads and prepares the hand image, finding the marker tip location."""
        if not os.path.exists(self.hand_image_path):
            print(f"Warning: Hand asset not found at {self.hand_image_path}. A mock marker will be used.")
            return

        # Load BGRA hand image
        self.hand_img = cv2.imread(self.hand_image_path, cv2.IMREAD_UNCHANGED)
        if self.hand_img is None:
            print("Warning: Could not read hand asset. A mock marker will be used.")
            return
            
        # Resize hand to be proportionate to 1080x1920 canvas (e.g., width of 380px)
        scale_w = 380
        aspect = self.hand_img.shape[0] / self.hand_img.shape[1]
        scale_h = int(scale_w * aspect)
        self.hand_img = cv2.resize(self.hand_img, (scale_w, scale_h))
        
        # Determine marker tip coordinate inside the cropped hand asset.
        # By default, for a hand holding a marker pointing up/left:
        # the tip of the marker will be the topmost/leftmost dark pixel.
        if self.hand_img.shape[2] == 4:
            alpha = self.hand_img[:, :, 3]
            # Find all non-transparent pixels
            non_transparent = np.argwhere(alpha > 50)
            if len(non_transparent) > 0:
                # Find the pixel that is closest to top-left (minimize x + y)
                sums = non_transparent[:, 0] + non_transparent[:, 1]
                idx = np.argmin(sums)
                self.marker_tip_offset = (non_transparent[idx][1], non_transparent[idx][0])
                print(f"Marker tip detected at offset: {self.marker_tip_offset}")
            else:
                self.marker_tip_offset = (20, 20)
        else:
            self.marker_tip_offset = (20, 20)

    def generate_whiteboard_video(self, sketch_path, output_path, duration=4.0, fps=30):
        """
        Creates a vertical 1080x1920 whiteboard MP4 video.
        :param sketch_path: Path to the input black-and-white sketch image.
        :param output_path: Path to the output MP4 file.
        :param duration: Total video duration in seconds.
        :param fps: Frames per second.
        """
        total_frames = int(duration * fps)
        
        # Load and resize sketch image to fit 1080x1920
        sketch_raw = cv2.imread(sketch_path)
        if sketch_raw is None:
            print(f"Error: Could not load sketch image at {sketch_path}")
            return False
            
        # Fit to 1080x1920 with padding (preserve aspect ratio)
        canvas_w, canvas_h = 1080, 1920
        canvas_bg = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 255
        
        h_orig, w_orig = sketch_raw.shape[:2]
        aspect_ratio = w_orig / h_orig
        
        if aspect_ratio > (canvas_w / canvas_h):
            new_w = canvas_w - 100
            new_h = int(new_w / aspect_ratio)
        else:
            new_h = canvas_h - 200
            new_w = int(new_h * aspect_ratio)
            
        sketch_resized = cv2.resize(sketch_raw, (new_w, new_h))
        
        # Center the sketch on white canvas
        x_offset = (canvas_w - new_w) // 2
        y_offset = (canvas_h - new_h) // 2
        
        sketch_full = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 255
        sketch_full[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = sketch_resized
        
        # Prepare temporary directory for frames
        tmp_dir = tempfile.mkdtemp()
        
        # Generate the drawing trajectory (Zigzag sweep/raster scan path)
        # We start at the top-left of the sketch bounding box and cover it systematically
        y_start, y_end = y_offset, y_offset + new_h
        x_start, x_end = x_offset, x_offset + new_w
        
        rows = 12 # Number of sweeps/lines to draw
        row_height = (y_end - y_start) // rows
        
        path_points = []
        for r in range(rows):
            curr_y = y_start + r * row_height + (row_height // 2)
            # Alternate directions for realistic zigzag drawing
            if r % 2 == 0:
                xs = np.linspace(x_start, x_end, total_frames // rows)
            else:
                xs = np.linspace(x_end, x_start, total_frames // rows)
            for x in xs:
                path_points.append((int(x), int(curr_y)))
                
        # Pad path_points to match total_frames if rounding discrepancies exist
        while len(path_points) < total_frames:
            path_points.append(path_points[-1])
        path_points = path_points[:total_frames]
        
        # Draw frame by frame
        # Keep track of the reveal mask (cumulative sweep of white brush)
        reveal_mask = np.zeros((canvas_h, canvas_w), dtype=np.uint8)
        brush_radius = 160 # Large enough to reveal rows smoothly
        
        for f in range(total_frames):
            pos_x, pos_y = path_points[f]
            
            # Update mask with brush stroke at marker position
            cv2.circle(reveal_mask, (pos_x, pos_y), brush_radius, 255, -1)
            
            # Create composited frame
            # Black sketch lines are revealed under the white parts of reveal_mask
            mask_3ch = cv2.merge([reveal_mask, reveal_mask, reveal_mask])
            canvas = np.where(mask_3ch == 255, sketch_full, canvas_bg)
            
            # Overlay hand holding marker
            if self.hand_img is not None:
                # Add human jitter to hand position
                jitter_x = int(pos_x + np.random.uniform(-4, 4))
                jitter_y = int(pos_y + np.random.uniform(-4, 4))
                
                # Determine placement coordinates
                hand_x = jitter_x - self.marker_tip_offset[0]
                hand_y = jitter_y - self.marker_tip_offset[1]
                
                # Composite transparent PNG onto the frame
                canvas = self._overlay_rgba_on_rgb(canvas, self.hand_img, hand_x, hand_y)
            else:
                # Fallback: Draw a black marker tip circle
                cv2.circle(canvas, (pos_x, pos_y), 10, (50, 50, 50), -1)
                
            frame_path = os.path.join(tmp_dir, f"frame_{f:05d}.jpg")
            cv2.imwrite(frame_path, canvas)
            
        # Compile frames into MP4 video via FFmpeg or fallback to OpenCV VideoWriter
        has_ffmpeg = shutil.which("ffmpeg") is not None
        
        if has_ffmpeg:
            ffmpeg_cmd = [
                "ffmpeg", "-y", "-framerate", str(fps), "-i", os.path.join(tmp_dir, "frame_%05d.jpg"),
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0",
                output_path
            ]
            try:
                subprocess.run(ffmpeg_cmd, capture_output=True, text=True, check=True)
                print(f"Whiteboard video saved via FFmpeg to: {output_path}")
                success = True
            except subprocess.CalledProcessError as e:
                print("FFmpeg error:", e.stderr)
                success = False
            finally:
                shutil.rmtree(tmp_dir)
        else:
            print("FFmpeg not found in PATH. Falling back to OpenCV VideoWriter...")
            try:
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                out = cv2.VideoWriter(output_path, fourcc, fps, (canvas_w, canvas_h))
                for f in range(total_frames):
                    frame_path = os.path.join(tmp_dir, f"frame_{f:05d}.jpg")
                    frame_img = cv2.imread(frame_path)
                    if frame_img is not None:
                        out.write(frame_img)
                out.release()
                print(f"Whiteboard video saved via OpenCV to: {output_path}")
                success = True
            except Exception as e:
                print("OpenCV VideoWriter error:", e)
                success = False
            finally:
                shutil.rmtree(tmp_dir)
                
        return success

    def _overlay_rgba_on_rgb(self, background, overlay, x, y):
        """Overlay a BGRA image on a BGR background at coordinate x, y."""
        h_ov, w_ov = overlay.shape[:2]
        h_bg, w_bg = background.shape[:2]
        
        # Check boundary collision and crop if necessary
        x1_ov, y1_ov = max(0, -x), max(0, -y)
        x2_ov = min(w_ov, w_bg - x)
        y2_ov = min(h_ov, h_bg - y)
        
        x1_bg, y1_bg = max(0, x), max(0, y)
        x2_bg = min(w_bg, x + w_ov)
        y2_bg = min(h_bg, y + h_ov)
        
        if x2_ov <= x1_ov or y2_ov <= y1_ov:
            return background
            
        overlay_cropped = overlay[y1_ov:y2_ov, x1_ov:x2_ov]
        bg_cropped = background[y1_bg:y2_bg, x1_bg:x2_bg]
        
        # Extract alpha mask
        alpha = overlay_cropped[:, :, 3] / 255.0
        alpha_3ch = cv2.merge([alpha, alpha, alpha])
        
        # Alpha blend
        blend = overlay_cropped[:, :, :3] * alpha_3ch + bg_cropped * (1.0 - alpha_3ch)
        background[y1_bg:y2_bg, x1_bg:x2_bg] = blend.astype(np.uint8)
        
        return background

if __name__ == "__main__":
    # Test stub
    if len(sys.argv) < 3:
        print("Usage: python viral_sketch_engine.py <sketch_image> <output_video> [duration]")
        sys.exit(1)
        
    sketch_img = sys.argv[1]
    out_video = sys.argv[2]
    dur = float(sys.argv[3]) if len(sys.argv) > 3 else 4.0
    
    engine = ViralSketchEngine()
    engine.generate_whiteboard_video(sketch_img, out_video, duration=dur)
