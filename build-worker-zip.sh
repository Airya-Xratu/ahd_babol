#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Create a ZIP file for deploying the worker to Liara
#
# Usage:  ./build-worker-zip.sh
# Output: worker-deploy.zip
#
# Then upload worker-deploy.zip to Liara Console:
#   ahd-worker → استقرار → استقرار جدید → آپلود سورس‌کد
# ─────────────────────────────────────────────────────────────

set -e

ZIP_NAME="worker-deploy.zip"
TMP_DIR=$(mktemp -d)

echo "📦 Preparing worker deployment package..."

# Copy only the files the worker Dockerfile needs
cp worker.Dockerfile "$TMP_DIR/"
cp worker.ts        "$TMP_DIR/"
cp package.json     "$TMP_DIR/"

# Copy package-lock.json if it exists
if [ -f package-lock.json ]; then
  cp package-lock.json "$TMP_DIR/"
  echo "  ✓ package-lock.json included"
else
  echo "  ⚠ No package-lock.json — Dockerfile will use npm install (slower build)"
fi

# Copy prisma schema (needed for prisma generate)
mkdir -p "$TMP_DIR/prisma"
cp prisma/schema.prisma "$TMP_DIR/prisma/"
echo "  ✓ prisma/schema.prisma included"

# Create the ZIP
cd "$TMP_DIR"
zip -r "$OLDPWD/$ZIP_NAME" . > /dev/null
cd "$OLDPWD"

# Cleanup
rm -rf "$TMP_DIR"

SIZE=$(du -h "$ZIP_NAME" | cut -f1)
echo ""
echo "✅ Created $ZIP_NAME ($SIZE)"
echo ""
echo "📤 Upload steps:"
echo "   1. Go to Liara Console → ahd-worker → استقرار (Deployments)"
echo "   2. Click استقرار جدید (New Deployment)"
echo "   3. Select آپلود سورس‌کد (Upload Source Code)"
echo "   4. Upload: $ZIP_NAME"
echo "   5. Set Dockerfile path: worker.Dockerfile"
echo "   6. Click استقرار (Deploy)"
