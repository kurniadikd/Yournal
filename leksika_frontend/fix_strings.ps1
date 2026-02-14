
$path = "c:\Folder_D\DANU\situs\Leksika\sandbox\leksika_frontend\src\components\Aplikasi\Admin\ManajemenNarasi.vue"

# Force reading as a single string
$content = [System.IO.File]::ReadAllText($path)

# Define the target broken string (with newlines)
# We construct it carefully to match windows line endings or any whitespace
# The broken string is:
# {{ $t('no_description') || 'No description
#                                                                         available' }}
#
# We will Use a regex that is flexible with whitespace
$pattern = "\{\{\s*\$t\('no_description'\)\s*\|\|\s*'No description\s+available'\s*\}\}"

# Replacement
$replacement = "{{ `$t('no_description') || 'No description available' }}"

# Perform replacement
$newContent = [Regex]::Replace($content, $pattern, $replacement)

if ($content.Length -ne $newContent.Length) {
    [System.IO.File]::WriteAllText($path, $newContent)
    Write-Host "Success: Fixed unterminated string literals."
} else {
    Write-Host "Warning: No changes made. Checking for the string manually."
    
    # Debugging: Locate where the string might be
    $index = $content.IndexOf("No description")
    if ($index -ge 0) {
        Write-Host "Found 'No description' at index $index"
        $snippet = $content.Substring($index, min 50 ($content.Length - $index))
        Write-Host "Snippet: $snippet"
    } else {
        Write-Host "'No description' not found in file."
    }
}
