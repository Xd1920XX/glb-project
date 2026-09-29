#!/usr/bin/env bash
set -euo pipefail

# Compress all GLBs in public/ that exceed 20 MiB.
# Overwrites in place. Original tracked by git for revert.

THRESHOLD=$((20 * 1024 * 1024))
count=0

while IFS= read -r -d '' f; do
  size=$(stat -f%z "$f")
  if [ "$size" -gt "$THRESHOLD" ]; then
    tmp="$(mktemp -t glb.XXXXXX).glb"
    echo "Compressing: $f ($(du -h "$f" | cut -f1))"
    npx --yes @gltf-transform/cli optimize "$f" "$tmp" --texture-compress webp
    mv "$tmp" "$f"
    echo "  → $(du -h "$f" | cut -f1)"
    count=$((count+1))
  fi
done < <(find public -name "*.glb" -print0)

echo "Compressed $count files."
