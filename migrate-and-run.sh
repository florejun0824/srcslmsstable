#!/bin/bash
# migrate-and-run.sh
# 1️⃣ Rename JSX .js files to .jsx
# 2️⃣ Update all import paths
# 3️⃣ Run the dev server

echo "Step 1: Renaming JSX-containing .js files to .jsx..."
find src -name '*.js' | while read file; do
    if grep -q "<.*>" "$file"; then
        newfile="${file%.js}.jsx"
        echo "Renaming: $file → $newfile"
        mv "$file" "$newfile"
    fi
done

echo "Step 2: Updating import paths in all src/ files..."
grep -rl "from '.*\.js'" src/ | while read impfile; do
    echo "Updating imports in: $impfile"
    # macOS syntax; for Linux use `sed -i 's/\.js/\.jsx/g' "$impfile"`
    sed -i '' 's/\.js/\.jsx/g' "$impfile"
done

echo "Step 3: Running Vite dev server..."
npm run dev
