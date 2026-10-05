import os

root_dir = r"c:\Sher_AI_Studio\projects\ViralEngine"

dir_sizes = {}
file_list = []

for dirpath, dirnames, filenames in os.walk(root_dir):
    # Skip .git and node_modules for listing
    if '.git' in dirpath or 'node_modules' in dirpath:
        continue
    
    total_dir_bytes = 0
    for f in filenames:
        fp = os.path.join(dirpath, f)
        try:
            sz = os.path.getsize(fp)
            total_dir_bytes += sz
            file_list.append((fp, sz))
        except Exception:
            pass
    
    rel_dir = os.path.relpath(dirpath, root_dir)
    dir_sizes[rel_dir] = total_dir_bytes

file_list.sort(key=lambda x: x[1], reverse=True)

print("=== 20 LARGEST FILES IN REPO ===")
for fp, sz in file_list[:20]:
    rel = os.path.relpath(fp, root_dir)
    print(f"{sz / (1024*1024):8.2f} MB  -  {rel}")

print("\n=== LARGEST DIRECTORIES ===")
sorted_dirs = sorted(dir_sizes.items(), key=lambda x: x[1], reverse=True)
for d, sz in sorted_dirs[:15]:
    if sz > 1024 * 1024:
        print(f"{sz / (1024*1024):8.2f} MB  -  {d}")
