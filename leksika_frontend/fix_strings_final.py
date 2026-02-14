
import re
import os

file_path = r"c:\Folder_D\DANU\situs\Leksika\sandbox\leksika_frontend\src\components\Aplikasi\Admin\ManajemenNarasi.vue"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match the broken string with variable whitespace/newlines
# Matches: {{ $t('no_description') || 'No description<newline><spaces>available' }}
pattern = r"\{\{\s*\$t\('no_description'\)\s*\|\|\s*'No description\s+available'\s*\}\}"

# Replacement: Single line version
replacement = "{{ $t('no_description') || 'No description available' }}"

new_content = re.sub(pattern, replacement, content)

if content != new_content:
    print("Found and replaced occurrences.")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
else:
    print("No occurrences found to replace.")
