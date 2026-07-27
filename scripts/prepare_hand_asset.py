import cv2
import numpy as np
import os
import glob

def make_hand_transparent():
    # Find the generated hand image in the brain folder
    brain_path = r"C:\Users\Huawei MadeBook XPro\.gemini\antigravity-ide\brain\5ba25353-8541-4f6d-a62d-5435c234bef9"
    pattern = os.path.join(brain_path, "drawing_hand_*.png")
    matches = glob.glob(pattern)
    
    if not matches:
        print("Error: Generated hand image not found.")
        return
        
    src_path = matches[0]
    print(f"Reading image from: {src_path}")
    
    img = cv2.imread(src_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print("Error: Could not read image.")
        return
        
    # Convert BGR to BGRA if necessary
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
        
    # The background is white (255, 255, 255). We make white pixels transparent.
    # We use a threshold on brightness (or distance from white)
    # Brightness (V in HSV) or just check R, G, B channels
    b, g, r, a = cv2.split(img)
    
    # White pixels will have b, g, r all near 255.
    white_mask = (b > 240) & (g > 240) & (r > 240)
    
    # Set alpha channel to 0 for white pixels, 255 for others
    a[white_mask] = 0
    a[~white_mask] = 255
    
    # Re-merge channels
    transparent_img = cv2.merge([b, g, r, a])
    
    # Crop to content to make it compact
    non_zero_coords = np.argwhere(a > 0)
    if len(non_zero_coords) > 0:
        y_min, x_min = non_zero_coords.min(axis=0)
        y_max, x_max = non_zero_coords.max(axis=0)
        transparent_img = transparent_img[y_min:y_max+1, x_min:x_max+1]
        print(f"Cropped transparent image size: {transparent_img.shape}")
        
    # Save the output to public/assets/studio/
    dest_dir = "public/assets/studio"
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, "drawing_hand.png")
    
    cv2.imwrite(dest_path, transparent_img)
    print(f"Successfully saved transparent hand to: {dest_path}")

if __name__ == "__main__":
    make_hand_transparent()
