#!/usr/bin/env bash
#
# Build both signed APKs and publish them as a GitHub Release.
#
#   ./scripts/publish-android-release.sh            # uses v<mobile/package.json version>
#   ./scripts/publish-android-release.sh v0.2.1     # explicit tag
#
# Requires: pnpm, JDK 21, Android SDK, and an authenticated GitHub CLI
# (`gh auth login`). The keystore must already be configured locally via
# mobile/android/keystore.properties (never commit it).
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v gh >/dev/null 2>&1; then
  echo "error: GitHub CLI (gh) is required: https://cli.github.com/" >&2
  exit 1
fi

VERSION=$(node -p "require('./mobile/package.json').version")
TAG=${1:-"v$VERSION"}

if [ "$TAG" != "v$VERSION" ]; then
  echo "error: tag '$TAG' does not match mobile/package.json version 'v$VERSION'" >&2
  exit 1
fi

if [ ! -f mobile/android/keystore.properties ]; then
  echo "error: mobile/android/keystore.properties is missing; the APKs would be unsigned." >&2
  exit 1
fi

echo "==> Building phone APK"
pnpm mobile:apk:phone
echo "==> Building pad APK"
pnpm mobile:apk:pad

mkdir -p release
cp mobile/android/app/build/outputs/apk/phone/release/app-phone-release.apk \
  "release/Biu-for-Phone-$VERSION.apk"
cp mobile/android/app/build/outputs/apk/pad/release/app-pad-release.apk \
  "release/Biu-for-Pad-$VERSION.apk"
(cd release && sha256sum ./*.apk > SHA256SUMS.txt)

if gh release view "$TAG" >/dev/null 2>&1; then
  echo "==> Uploading assets to existing release $TAG"
  gh release upload "$TAG" release/* --clobber
else
  echo "==> Creating release $TAG"
  gh release create "$TAG" release/* \
    --title "Biu for Android $VERSION" \
    --generate-notes
fi

echo "==> Done: $TAG"
