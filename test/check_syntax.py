import re
import subprocess
import tempfile
import os

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract script type="module"
match = re.search(r'<script type="module">(.*?)</script>', content, re.DOTALL)
if not match:
    print("Error: Could not find <script type='module'>")
    exit(1)

js_code = match.group(1)
print(f"Extracted JS code: {len(js_code)} chars, {len(js_code.splitlines())} lines")

# Write to temp file and test with node --check
temp_file = 'temp_check_syntax.mjs'
with open(temp_file, 'w', encoding='utf-8') as f:
    f.write(js_code)

try:
    result = subprocess.run(['node', '--check', temp_file], capture_output=True, text=True)
    if result.returncode == 0:
        print("Syntax check passed! JavaScript in index.html is 100% syntactically valid.")
    else:
        print("Syntax error found:")
        print(result.stderr)
finally:
    if os.path.exists(temp_file):
        os.remove(temp_file)
