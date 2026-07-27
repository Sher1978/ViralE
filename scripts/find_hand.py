import cv2
import os
import glob

brain_dir = "C:/Users/Huawei MadeBook XPro/.gemini/antigravity-ide/brain/6f888469-9ad5-44c8-bfb9-13fe0aea8dde"
media_files = glob.glob(os.path.join(brain_dir, "media__*.png"))

for f in media_files:
    img = cv2.imread(f, cv2.IMREAD_UNCHANGED)
    if img is not None:
        h, w = img.shape[:2]
        c = img.shape[2] if len(img.shape) > 2 else 1
        # Check if it has 4 channels and has transparency
        has_alpha = "Yes" if c == 4 else "No"
        print(f"File: {os.path.basename(f)} | Size: {w}x{h} | Channels: {c} | Has Alpha: {has_alpha}")
