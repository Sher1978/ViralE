import cv2
import numpy as np
import os
import sys
import subprocess
import tempfile
import shutil
import math


class ViralSketchEngine:
    def __init__(self, hand_image_path=None):
        """
        Initialize the whiteboard sketch animation engine.
        :param hand_image_path: Path to the transparent PNG of a drawing hand holding a marker.
        """
        self.hand_image_path = hand_image_path or "public/assets/studio/drawing_hand.png"
        self.hand_img = None
        self.marker_tip_offset = (0, 0)
        self._load_hand_asset()

    # ------------------------------------------------------------------
    # Hand asset
    # ------------------------------------------------------------------

    def _load_hand_asset(self):
        """Loads the hand PNG asset; falls back to a procedural hand if not found."""
        if not os.path.exists(self.hand_image_path):
            print(f"[SketchEngine] Hand asset not found at {self.hand_image_path}. Generating procedural hand.")
            self.hand_img = self._generate_procedural_hand()
            self.marker_tip_offset = (18, 10)
            return

        img = cv2.imread(self.hand_image_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            print("[SketchEngine] Could not read hand asset. Generating procedural hand.")
            self.hand_img = self._generate_procedural_hand()
            self.marker_tip_offset = (18, 10)
            return

        # Resize to proportionate size for 1080x1920 canvas
        scale_w = 320
        aspect = img.shape[0] / img.shape[1]
        scale_h = int(scale_w * aspect)
        self.hand_img = cv2.resize(img, (scale_w, scale_h))

        if self.hand_img.shape[2] == 4:
            alpha = self.hand_img[:, :, 3]
            non_transparent = np.argwhere(alpha > 50)
            if len(non_transparent) > 0:
                sums = non_transparent[:, 0] + non_transparent[:, 1]
                idx = np.argmin(sums)
                self.marker_tip_offset = (non_transparent[idx][1], non_transparent[idx][0])
            else:
                self.marker_tip_offset = (20, 20)
        else:
            self.marker_tip_offset = (20, 20)

    def _generate_procedural_hand(self):
        """
        Generates a simple but convincing hand-holding-marker sprite as a BGRA numpy array.
        The hand is drawn in skin tones with a dark blue marker visible below the fingers.
        """
        w, h = 220, 320
        img = np.zeros((h, w, 4), dtype=np.uint8)

        # --- Marker body (dark blue cylinder, angled ~30 deg) ---
        skin = (130, 160, 210)   # BGR skin tone (warm beige)
        skin_dark = (100, 130, 185)
        marker_col = (60, 40, 20)       # dark navy marker
        marker_tip_col = (20, 20, 20)   # felt tip

        # Marker: a rotated rectangle from tip (18,10) downward-right
        marker_pts = np.array([
            [18, 10], [28, 10], [70, 160], [55, 160]
        ], dtype=np.int32)
        cv2.fillPoly(img[:, :, :3], [marker_pts], marker_col)
        cv2.fillPoly(img[:, :, 3:4], [marker_pts], [[255]])

        # Marker tip (felt tip triangle)
        tip_pts = np.array([[18, 10], [28, 10], [23, 0]], dtype=np.int32)
        cv2.fillPoly(img[:, :, :3], [tip_pts], marker_tip_col)
        cv2.fillPoly(img[:, :, 3:4], [tip_pts], [[255]])

        # --- Palm (ellipse) ---
        palm_cx, palm_cy = 105, 240
        cv2.ellipse(img[:, :, :3], (palm_cx, palm_cy), (80, 65), -20, 0, 360, skin, -1)
        cv2.ellipse(img[:, :, 3:4], (palm_cx, palm_cy), (80, 65), -20, 0, 360, [255], -1)

        # --- Thumb (short fat) ---
        thumb_pts = np.array([
            [50, 220], [30, 190], [22, 155], [38, 148], [55, 180], [72, 208]
        ], dtype=np.int32)
        cv2.fillPoly(img[:, :, :3], [thumb_pts], skin)
        cv2.fillPoly(img[:, :, 3:4], [thumb_pts], [[255]])

        # --- Index finger (gripping marker) ---
        idx_pts = np.array([
            [55, 200], [48, 160], [42, 110], [58, 105], [68, 152], [72, 195]
        ], dtype=np.int32)
        cv2.fillPoly(img[:, :, :3], [idx_pts], skin)
        cv2.fillPoly(img[:, :, 3:4], [idx_pts], [[255]])

        # --- Middle finger ---
        mid_pts = np.array([
            [78, 195], [74, 145], [72, 95], [88, 92], [95, 140], [98, 192]
        ], dtype=np.int32)
        cv2.fillPoly(img[:, :, :3], [mid_pts], skin)
        cv2.fillPoly(img[:, :, 3:4], [mid_pts], [[255]])

        # --- Ring finger (partially curled) ---
        ring_pts = np.array([
            [100, 193], [100, 150], [100, 115], [114, 115], [116, 152], [118, 192]
        ], dtype=np.int32)
        cv2.fillPoly(img[:, :, :3], [ring_pts], skin)
        cv2.fillPoly(img[:, :, 3:4], [ring_pts], [[255]])

        # --- Pinky (short, slightly curled) ---
        pink_pts = np.array([
            [120, 195], [122, 158], [125, 135], [137, 138], [136, 162], [134, 196]
        ], dtype=np.int32)
        cv2.fillPoly(img[:, :, :3], [pink_pts], skin)
        cv2.fillPoly(img[:, :, 3:4], [pink_pts], [[255]])

        # Add subtle shading
        shadow_pts = np.array([
            [55, 200], [48, 160], [52, 135], [62, 140], [65, 162], [68, 198]
        ], dtype=np.int32)
        overlay = img.copy()
        cv2.fillPoly(overlay[:, :, :3], [shadow_pts], skin_dark)
        cv2.addWeighted(img[:, :, :3], 0.7, overlay[:, :, :3], 0.3, 0, img[:, :, :3])

        # Blur slightly for softness
        img[:, :, :3] = cv2.GaussianBlur(img[:, :, :3], (3, 3), 0)

        return img

    # ------------------------------------------------------------------
    # Notebook background
    # ------------------------------------------------------------------

    def _generate_notebook_background(self, width=1080, height=1920):
        """
        Generates a realistic A5-style notebook page background:
        - Cream/off-white paper base with subtle paper grain
        - Blue horizontal grid lines (ruled paper)
        - Red vertical margin line
        - Spiral binding rings on the left edge
        """
        # Paper base: slightly warm cream
        base_color = np.array([232, 235, 240], dtype=np.uint8)  # BGR: slightly warm white
        bg = np.ones((height, width, 3), dtype=np.uint8) * base_color

        # Paper grain (Perlin-like noise)
        noise = np.random.randint(0, 8, (height, width), dtype=np.int16)
        for c in range(3):
            channel = bg[:, :, c].astype(np.int16)
            channel = np.clip(channel + noise - 4, 0, 255).astype(np.uint8)
            bg[:, :, c] = channel

        # Horizontal grid lines (light blue, ~24px apart)
        line_spacing = 62
        line_color = (190, 195, 210)  # BGR: soft blue-grey
        y = 180  # first line starts after header area
        while y < height - 80:
            cv2.line(bg, (80, y), (width - 40, y), line_color, 1, cv2.LINE_AA)
            y += line_spacing

        # Red vertical margin line (classic ruled paper style)
        margin_x = 130
        cv2.line(bg, (margin_x, 40), (margin_x, height - 40), (100, 100, 210), 2, cv2.LINE_AA)

        # Subtle inner shadow (page depth effect)
        for i in range(30):
            alpha = 0.01 * (30 - i) / 30
            shade = int(alpha * 30)
            cv2.rectangle(bg, (i, i), (width - i, height - i), 
                         (max(0, base_color[0] - shade),
                          max(0, base_color[1] - shade),
                          max(0, base_color[2] - shade)), 1)

        # Spiral binding rings on the LEFT SIDE
        ring_color = (80, 80, 95)   # BGR dark metal grey
        ring_highlight = (160, 165, 175)
        ring_x_center = 38
        ring_spacing = 95
        ring_r_outer = 22
        ring_r_inner = 14

        for ry in range(100, height - 80, ring_spacing):
            # Outer ring (oval, dark)
            cv2.ellipse(bg, (ring_x_center, ry), (ring_r_outer, ring_r_outer // 2),
                        0, 0, 360, ring_color, 3, cv2.LINE_AA)
            # Inner oval (lighter, gives 3D effect)
            cv2.ellipse(bg, (ring_x_center + 3, ry - 2), (ring_r_inner, ring_r_inner // 2 - 1),
                        0, 0, 360, ring_highlight, 2, cv2.LINE_AA)
            # Top wire shadow
            cv2.line(bg, (ring_x_center - ring_r_outer, ry),
                     (ring_x_center + ring_r_outer, ry), ring_color, 1, cv2.LINE_AA)

        # White strip covering the left binding area (page edge after rings)
        cv2.rectangle(bg, (0, 0), (62, height), (225, 228, 234), -1)
        # Edge line separating binding from page
        cv2.line(bg, (62, 0), (62, height), (180, 185, 195), 2)

        return bg

    # ------------------------------------------------------------------
    # Main video generation
    # ------------------------------------------------------------------

    def generate_whiteboard_video(self, sketch_path, output_path, duration=4.0, fps=30):
        """
        Creates a vertical 1080x1920 whiteboard MP4 video with:
        - Notebook paper background
        - Progressive sketch reveal
        - Animated drawing hand
        """
        total_frames = int(duration * fps)

        # Load sketch image
        sketch_raw = cv2.imread(sketch_path)
        if sketch_raw is None:
            print(f"[SketchEngine] Error: Could not load sketch at {sketch_path}")
            return False

        canvas_w, canvas_h = 1080, 1920

        # Generate notebook background
        notebook_bg = self._generate_notebook_background(canvas_w, canvas_h)

        # Fit sketch inside the writable area of the page
        # Leave 80px left (for binding), 60px right, 180px top, 120px bottom
        page_x1, page_x2 = 80, canvas_w - 60
        page_y1, page_y2 = 180, canvas_h - 120
        page_w = page_x2 - page_x1
        page_h = page_y2 - page_y1

        h_orig, w_orig = sketch_raw.shape[:2]
        aspect_ratio = w_orig / h_orig

        # Scale sketch to fit in page content area
        if aspect_ratio > (page_w / page_h):
            new_w = page_w - 40
            new_h = int(new_w / aspect_ratio)
        else:
            new_h = page_h - 60
            new_w = int(new_h * aspect_ratio)

        sketch_resized = cv2.resize(sketch_raw, (new_w, new_h))

        # Center on page
        x_offset = page_x1 + (page_w - new_w) // 2
        y_offset = page_y1 + (page_h - new_h) // 2

        # Convert sketch to grayscale then back so it's clean black lines
        sketch_gray = cv2.cvtColor(sketch_resized, cv2.COLOR_BGR2GRAY)
        _, sketch_binary = cv2.threshold(sketch_gray, 200, 255, cv2.THRESH_BINARY)
        sketch_bgr = cv2.cvtColor(sketch_binary, cv2.COLOR_GRAY2BGR)

        # Place sketch on a full-canvas layer (transparent where empty)
        # sketch_canvas: BGR same as notebook; sketch_mask: 255 where ink
        sketch_canvas = notebook_bg.copy()
        # Place ink: where sketch_binary < 128 (dark = ink), override with dark ink color
        ink_color = np.array([25, 25, 35], dtype=np.uint8)  # Very dark near-black
        sketch_region = sketch_canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w]
        ink_mask = sketch_binary < 128  # True where there is ink
        sketch_region[ink_mask] = ink_color
        sketch_canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = sketch_region

        # Build ink mask on full canvas (used for progressive reveal)
        ink_full_mask = np.zeros((canvas_h, canvas_w), dtype=np.uint8)
        ink_full_mask[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = np.where(ink_mask, 255, 0).astype(np.uint8)

        # ------------------------------------------------------------------
        # Generate the drawing trajectory (zigzag sweep over sketch area)
        # ------------------------------------------------------------------
        y_start, y_end = y_offset, y_offset + new_h
        x_start, x_end = x_offset, x_offset + new_w

        rows = 14
        row_height = max(1, (y_end - y_start) // rows)
        path_points = []

        for r in range(rows):
            curr_y = y_start + r * row_height + (row_height // 2)
            n_pts = total_frames // rows
            if r % 2 == 0:
                xs = np.linspace(x_start, x_end, n_pts)
            else:
                xs = np.linspace(x_end, x_start, n_pts)
            for x in xs:
                path_points.append((int(x), int(curr_y)))

        while len(path_points) < total_frames:
            path_points.append(path_points[-1])
        path_points = path_points[:total_frames]

        # ------------------------------------------------------------------
        # Render frames
        # ------------------------------------------------------------------
        tmp_dir = tempfile.mkdtemp()
        reveal_mask = np.zeros((canvas_h, canvas_w), dtype=np.uint8)
        brush_radius = 140

        for f in range(total_frames):
            pos_x, pos_y = path_points[f]

            # Expand reveal mask
            cv2.circle(reveal_mask, (pos_x, pos_y), brush_radius, 255, -1)

            # Start with clean notebook background
            frame = notebook_bg.copy()

            # Only reveal ink where the brush has passed
            revealed_ink = cv2.bitwise_and(ink_full_mask, reveal_mask)
            ink_pixels = revealed_ink == 255

            frame[ink_pixels] = ink_color

            # Overlay hand / marker
            if self.hand_img is not None:
                jitter_x = int(pos_x + np.random.uniform(-3, 3))
                jitter_y = int(pos_y + np.random.uniform(-3, 3))
                hand_x = jitter_x - self.marker_tip_offset[0]
                hand_y = jitter_y - self.marker_tip_offset[1]
                frame = self._overlay_rgba_on_rgb(frame, self.hand_img, hand_x, hand_y)
            else:
                # Marker tip fallback: small dark oval
                cv2.ellipse(frame, (pos_x, pos_y), (8, 5), -30, 0, 360, (20, 20, 30), -1)

            frame_path = os.path.join(tmp_dir, f"frame_{f:05d}.jpg")
            cv2.imwrite(frame_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 92])

        # ------------------------------------------------------------------
        # Compile frames → MP4 via FFmpeg
        # ------------------------------------------------------------------
        has_ffmpeg = shutil.which("ffmpeg") is not None
        success = False

        if has_ffmpeg:
            ffmpeg_cmd = [
                "ffmpeg", "-y", "-framerate", str(fps),
                "-i", os.path.join(tmp_dir, "frame_%05d.jpg"),
                "-c:v", "libx264", "-pix_fmt", "yuv420p",
                "-profile:v", "high", "-level", "4.0",
                "-crf", "20",
                output_path
            ]
            try:
                result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, check=True)
                print(f"[SketchEngine] Video saved via FFmpeg → {output_path}")
                success = True
            except subprocess.CalledProcessError as e:
                print(f"[SketchEngine] FFmpeg error: {e.stderr}")
                success = False
            finally:
                shutil.rmtree(tmp_dir, ignore_errors=True)
        else:
            print("[SketchEngine] FFmpeg not found, falling back to OpenCV VideoWriter...")
            try:
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                out = cv2.VideoWriter(output_path, fourcc, fps, (canvas_w, canvas_h))
                for f in range(total_frames):
                    frame_path = os.path.join(tmp_dir, f"frame_{f:05d}.jpg")
                    frame_img = cv2.imread(frame_path)
                    if frame_img is not None:
                        out.write(frame_img)
                out.release()
                print(f"[SketchEngine] Video saved via OpenCV → {output_path}")
                success = True
            except Exception as e:
                print(f"[SketchEngine] OpenCV error: {e}")
                success = False
            finally:
                shutil.rmtree(tmp_dir, ignore_errors=True)

        return success

    # ------------------------------------------------------------------
    # Alpha compositing helper
    # ------------------------------------------------------------------

    def _overlay_rgba_on_rgb(self, background, overlay, x, y):
        """Overlay a BGRA image onto a BGR background at (x, y)."""
        h_ov, w_ov = overlay.shape[:2]
        h_bg, w_bg = background.shape[:2]

        x1_ov = max(0, -x)
        y1_ov = max(0, -y)
        x2_ov = min(w_ov, w_bg - x)
        y2_ov = min(h_ov, h_bg - y)

        x1_bg = max(0, x)
        y1_bg = max(0, y)
        x2_bg = min(w_bg, x + w_ov)
        y2_bg = min(h_bg, y + h_ov)

        if x2_ov <= x1_ov or y2_ov <= y1_ov:
            return background

        ov_crop = overlay[y1_ov:y2_ov, x1_ov:x2_ov]
        bg_crop = background[y1_bg:y2_bg, x1_bg:x2_bg]

        alpha = ov_crop[:, :, 3:4].astype(np.float32) / 255.0
        blended = (ov_crop[:, :, :3].astype(np.float32) * alpha +
                   bg_crop.astype(np.float32) * (1.0 - alpha))
        background[y1_bg:y2_bg, x1_bg:x2_bg] = blended.astype(np.uint8)
        return background


# ------------------------------------------------------------------
# CLI entry point
# ------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python viral_sketch_engine.py <sketch_image> <output_video> [duration]")
        sys.exit(1)

    sketch_img = sys.argv[1]
    out_video = sys.argv[2]
    dur = float(sys.argv[3]) if len(sys.argv) > 3 else 4.0

    engine = ViralSketchEngine()
    engine.generate_whiteboard_video(sketch_img, out_video, duration=dur)
