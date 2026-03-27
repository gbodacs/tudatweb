#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./pack-eb-release.sh [release-name]
# Example:
#   ./pack-eb-release.sh v1.2.3

RELEASE_NAME=${1:-"beanstalk-$(date +%Y%m%d-%H%M%S)"}
OUTPUT_ZIP="${RELEASE_NAME}.zip"
BUILD_DIR="build-eb-release"

echo "📦 Preparing Elastic Beanstalk release package: ${OUTPUT_ZIP}"

# Clean and build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "🛠️  Installing full dependencies for build..."
npm ci

echo "💡 Building TypeScript output..."
npm run build

echo "🧹 Pruning to production dependencies..."
npm prune --production

# Copy runtime artifacts (tolerate missing optional paths)
cp package.json "$BUILD_DIR/" 2>/dev/null || true
cp package-lock.json "$BUILD_DIR/" 2>/dev/null || true
cp .npmrc "$BUILD_DIR/" 2>/dev/null || true
[ -d "node_modules" ] && cp -r node_modules "$BUILD_DIR/"
[ -d "dist" ] && cp -r dist "$BUILD_DIR/"
[ -d "views" ] && cp -r views "$BUILD_DIR/"
[ -d "public" ] && cp -r public "$BUILD_DIR/"
[ -d "release" ] && cp -r release "$BUILD_DIR/"

# Include eb extensions/platform if existing
if [ -d ".ebextensions" ]; then
  cp -r .ebextensions "$BUILD_DIR/"
fi
if [ -d ".platform" ]; then
  cp -r .platform "$BUILD_DIR/"
fi

# Create final zip
pushd "$BUILD_DIR" > /dev/null
zip -r "../$OUTPUT_ZIP" .
popd > /dev/null

# Cleanup
rm -rf "$BUILD_DIR"

echo "✅ Elastic Beanstalk package created: $OUTPUT_ZIP"

echo "Next: deploy with AWS CLI or Elastic Beanstalk CLI:
  eb deploy --label $RELEASE_NAME
  aws elasticbeanstalk create-application-version ..."
