import os
import re
import glob

def fix_frontend():
    # Matches patterns like: d.branches || []
    # and data.services || []
    # Captures the object name and property name
    pattern = re.compile(r'([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*\|\|\s*\[\]')
    
    # Matches patterns like: d.branches || {}
    pattern_obj = re.compile(r'([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*\|\|\s*\{\}')

    # To avoid double-wrapping if run multiple times, we can skip if already wrapped
    # but the regex won't match Array.isArray anyway because there's no || [] in it directly if we replace it.
    
    def repl_array(m):
        obj = m.group(1)
        prop = m.group(2)
        return f"(Array.isArray({obj}) ? {obj} : ({obj}.{prop} || []))"

    def repl_obj(m):
        obj = m.group(1)
        prop = m.group(2)
        # For {}, it might be returning a single object directly, so we can't just check isArray.
        # But we only really have problems with arrays.
        return m.group(0) # don't touch {}

    files = glob.glob('frontend/src/**/*.jsx', recursive=True)
    count = 0
    for file in files:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content, subs = pattern.subn(repl_array, content)
        if subs > 0:
            with open(file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            count += 1
            print(f"Patched {subs} occurrences in {file}")

    print(f"Done! Modified {count} files.")

if __name__ == "__main__":
    fix_frontend()
