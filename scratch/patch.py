import codecs
import os

path = r'c:\Sher_AI_Studio\projects\ViralEngine\src\app\[locale]\app\(main)\projects\new\delivery\page.tsx'
if not os.path.exists(path):
    print("File not found")
    exit(1)

with codecs.open(path, 'r', 'utf-8') as f:
    content = f.read()

search = "await ffmpeg.writeFile('subs.srt', srtContent);"
replace = "console.log('SRT Len:', srtContent.length); await ffmpeg.writeFile('subs.srt', srtContent);"

if search in content:
    with codecs.open(path, 'w', 'utf-8') as f:
        f.write(content.replace(search, replace))
    print("Patched successfully")
else:
    print("Pattern not found")
