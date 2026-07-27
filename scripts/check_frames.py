import cv2
import os
import numpy as np

project_dir = "c:/Sher_AI_Studio/projects/ViralEngine"
video_path = os.path.join(project_dir, "test_out.mp4")

if not os.path.exists(video_path):
    print("Error: test_out.mp4 does not exist.")
    exit(1)

cap = cv2.VideoCapture(video_path)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
print(f"Video size: {w}x{h}, total frames: {total_frames}")

# Read first, middle and last frames
frames_to_check = [0, total_frames // 2, total_frames - 2]
for f_idx in frames_to_check:
    cap.set(cv2.CAP_PROP_POS_FRAMES, f_idx)
    ret, frame = cap.read()
    if not ret:
        print(f"Error: Could not read frame {f_idx}")
        continue
    
    # Save frame as debug
    out_name = os.path.join(project_dir, f"test_frame_{f_idx}.png")
    cv2.imwrite(out_name, frame)
    print(f"Saved frame {f_idx} to {out_name}")
    
    # Check if there is any dark color in the notebook area (x=120..960, y=190..1730)
    # The notebook has ruled lines, which are blueish. But let's check if there is any non-background color.
    # The background paper is around BGR [240, 236, 235]. Ruled lines are around [208, 195, 189].
    # Let's count how many pixels are dark (e.g. B < 150, G < 150, R < 150) inside the notebook area
    notebook_roi = frame[190:1730, 120:960]
    dark_pixels = np.sum((notebook_roi[:, :, 0] < 120) & (notebook_roi[:, :, 1] < 120) & (notebook_roi[:, :, 2] < 120))
    print(f"Frame {f_idx} | Dark pixels in sketch area: {dark_pixels}")
cap.release()
