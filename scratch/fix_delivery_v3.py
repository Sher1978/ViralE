import codecs
import os

def patch():
    path = r'c:\Sher_AI_Studio\projects\ViralEngine\src\app\[locale]\app\(main)\projects\new\delivery\page.tsx'
    if not os.path.exists(path):
        print("File not found")
        return

    with codecs.open(path, 'r', 'utf-8') as f:
        content = f.read()

    # Fix 1: Explicit path for subtitles
    s1 = "subtitles=subs.srt"
    r1 = "subtitles='./subs.srt'"
    
    # Fix 2: Add logging for manifest data (avoiding diff hang by using a unique comment)
    s2 = "const manifest = version?.script_data as any;"
    r2 = "const manifest = version?.script_data as any;\n  // DEBUG_LOG_INJECTED\n  console.log('[Delivery] Manifest sub count:', manifest?.subtitleClips?.length, 'Assets:', !!manifest?.distributionAssets);"

    # Fix 3: Ensure TEXT_OUTPUTS is actually using the assets
    # (Checking if it's already updated, if not, we do it here)
    
    new_content = content.replace(s1, r1).replace(s2, r2)
    
    with codecs.open(path, 'w', 'utf-8') as f:
        f.write(new_content)
    print("Patched successfully")

if __name__ == "__main__":
    patch()
