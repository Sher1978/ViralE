import cv2
import numpy as np
import os

project_dir = "c:/Sher_AI_Studio/projects/ViralEngine"
notebook_path = os.path.join(project_dir, "public/assets/studio/notebook_bg.png")
composited_path = os.path.join(project_dir, "test_composited.png")

bg = cv2.imread(notebook_path)
comp = cv2.imread(composited_path)

if bg is None or comp is None:
    print("Error: Could not read image.")
    exit(1)

# Resize to match exactly
if bg.shape != comp.shape:
    bg = cv2.resize(bg, (comp.shape[1], comp.shape[0]))

# Find absolute difference
diff = cv2.absdiff(bg, comp)
gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
_, thresh = cv2.threshold(gray_diff, 10, 255, cv2.THRESH_BINARY)

num_diff_pixels = np.sum(thresh > 0)
total_pixels = comp.shape[0] * comp.shape[1]
diff_ratio = num_diff_pixels / total_pixels * 100

print(f"Diff pixels: {num_diff_pixels} ({diff_ratio:.3f}%)")

if num_diff_pixels > 1000:
    print("SUCCESS: Sketch drawings are present on the composite image!")
else:
    print("FAILED: No sketch drawings on the composite image (it matches the background almost perfectly).")
