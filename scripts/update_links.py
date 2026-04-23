import os
import re

root_dir = r'c:\Sher_AI_Studio\projects\ViralEngine\src\app\[locale]\app'
patterns = [
    'projects', 'ideas', 'dashboard', 'billing', 'profile', 'onboarding'
]

# Regex to find /${locale}/ followed by one of our app routes
# Handles both `/${locale}/route` and `/${locale}/route/`
regex = re.compile(r'/\${locale}/(' + '|'.join(patterns) + r')')

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = regex.sub(r'/${locale}/app/\1', content)
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {path}")
