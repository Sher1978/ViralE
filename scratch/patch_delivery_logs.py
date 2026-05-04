import os
import codecs

def patch_file(file_path, patch_id, search_pattern, replacement_text):
    if not os.path.exists(file_path):
        print(f"[{patch_id}] Error: File not found: {file_path}")
        return False
    
    with codecs.open(file_path, 'r', 'utf-8') as f:
        content = f.read()
    
    found = False
    for sp in [search_pattern, search_pattern.replace('\n', '\r\n')]:
        if sp in content:
            new_content = content.replace(sp, replacement_text)
            with codecs.open(file_path, 'w', 'utf-8') as f:
                f.write(new_content)
            print(f"[{patch_id}] Successfully patched!")
            found = True
            break
            
    if not found:
        print(f"[{patch_id}] Error: Pattern not found")
    return found

target = r'c:\Sher_AI_Studio\projects\ViralEngine\src\app\[locale]\app\(main)\projects\new\delivery\page.tsx'

search = """      setRenderStatus('Подготовка субтитров...');
      const subs = manifest.subtitleClips || manifest.segments?.[0]?.subtitleClips || [];
      console.log('[Delivery] Finalizing subtitles count:', subs.length);
      const srtContent = generateSRT(subs);
      await ffmpeg.writeFile('subs.srt', srtContent);"""

replace = """      setRenderStatus('Подготовка субтитров...');
      const subs = manifest.subtitleClips || manifest.segments?.[0]?.subtitleClips || [];
      console.log('[Delivery] Finalizing subtitles count:', subs.length);
      if (subs.length > 0) {
        console.log('[Delivery] First sub sample:', subs[0]);
      }
      const srtContent = generateSRT(subs);
      console.log('[Delivery] SRT content length:', srtContent.length);
      await ffmpeg.writeFile('subs.srt', srtContent);"""

patch_file(target, 'delivery_logging', search, replace)
