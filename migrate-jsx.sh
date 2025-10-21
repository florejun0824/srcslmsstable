#!/bin/bash
# migrate-jsx-full.sh
# Rename all JSX .js files to .jsx and update imports

echo "Starting full JSX migration..."

# 1️⃣ Rename all .js files containing JSX to .jsx
find src -name '*.js' | while read file; do
    # Detect JSX by searching for "<" inside the file
    if grep -q "<.*>" "$file"; then
        newfile="${file%.js}.jsx"
        echo "Renaming: $file → $newfile"
        mv "$file" "$newfile"
    fi
done

# 2️⃣ Update all imports in src/
echo "Updating import paths in all source files..."
# Find all JS/JSX/TSX files to update imports
find src -type f \( -name '*.js' -o -name '*.jsx' -o -name '*.ts' -o -name '*.tsx' \) | while read impfile; do
    # Replace relative imports ending with .js → .jsx
    sed -i '' -E 's|(from ["'"'"'].*)\.js(["'"'"'])|\1.jsx\2|g' "$impfile"
done

echo "Migration complete ✅"
echo "Next steps:"
echo "1. Restart Vite: npm run dev"
echo "2. Verify your app works. All JSX components should now compile."
