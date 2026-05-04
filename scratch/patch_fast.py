import codecs
import os
path = r'c:\Sher_AI_Studio\projects\ViralEngine\src\app\[locale]\app\(main)\projects\new\delivery\page.tsx'
with codecs.open(path, 'r', 'utf-8') as f:
    c = f.read()
c = c.replace('subtitles=subs.srt', " subtitles=./subs.srt\)
if 'console.log' not in c:
 c = c.replace('const manifest = version?.script_data as any;', 'const manifest = version?.script_data as any; console.log(\[Delivery] Debug:\, !!manifest?.distributionAssets);')
with codecs.open(path, 'w', 'utf-8') as f:
 f.write(c)
print('Done')
