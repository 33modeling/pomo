#!/usr/bin/env bash
#
# Generates a release keystore for signing the Pomo APK/AAB and writes
# android/keystore.properties. Both files are gitignored — keep them safe and
# backed up: losing the keystore means you can no longer update the app on Play.
#
# Interactive:
#   bash scripts/gen-keystore.sh
#
# Non-interactive (env overrides):
#   KEYSTORE_PASSWORD=secret KEY_ALIAS=pomo bash scripts/gen-keystore.sh
#   Optional: KEY_PASSWORD, KEY_DNAME, KEY_VALIDITY_DAYS, KEYSTORE_FILE, JDK_DIR
set -euo pipefail

JDK_DIR="${JDK_DIR:-$HOME/.local/jdk21}"
KEYTOOL="$JDK_DIR/bin/keytool"
command -v "$KEYTOOL" >/dev/null 2>&1 || KEYTOOL="keytool"

ANDROID_DIR="$(cd "$(dirname "$0")/.." && pwd)/android"
KEYSTORE_FILE_NAME="${KEYSTORE_FILE:-pomo-release.jks}"
KEYSTORE_PATH="$ANDROID_DIR/$KEYSTORE_FILE_NAME"
ALIAS="${KEY_ALIAS:-pomo}"
VALIDITY="${KEY_VALIDITY_DAYS:-10000}"
DNAME="${KEY_DNAME:-CN=Pomo, OU=Pomo, O=Pomo, L=Seoul, ST=Seoul, C=KR}"

if [ -f "$KEYSTORE_PATH" ]; then
  echo "Keystore already exists: $KEYSTORE_PATH"
  echo "Delete it first if you really want to regenerate (this is destructive)."
  exit 0
fi

STORE_PW="${KEYSTORE_PASSWORD:-}"
if [ -z "$STORE_PW" ]; then
  read -rsp "Keystore password (min 6 chars): " STORE_PW; echo
  read -rsp "Confirm password: " STORE_PW2; echo
  [ "$STORE_PW" = "$STORE_PW2" ] || { echo "Passwords do not match."; exit 1; }
fi
[ ${#STORE_PW} -ge 6 ] || { echo "Password must be at least 6 characters."; exit 1; }
KEY_PW="${KEY_PASSWORD:-$STORE_PW}"

echo "Generating keystore at $KEYSTORE_PATH ..."
"$KEYTOOL" -genkeypair -v \
  -keystore "$KEYSTORE_PATH" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity "$VALIDITY" \
  -storepass "$STORE_PW" -keypass "$KEY_PW" \
  -dname "$DNAME"

cat > "$ANDROID_DIR/keystore.properties" <<EOF
storeFile=$KEYSTORE_FILE_NAME
storePassword=$STORE_PW
keyAlias=$ALIAS
keyPassword=$KEY_PW
EOF
chmod 600 "$ANDROID_DIR/keystore.properties" 2>/dev/null || true

echo
echo "✓ Wrote:"
echo "  $KEYSTORE_PATH"
echo "  $ANDROID_DIR/keystore.properties   (both gitignored)"
echo
echo "Build a signed release:"
echo "  npm run android:apk:release   # signed APK"
echo "  npm run android:aab           # signed AAB for Play Store"
echo
echo "⚠  BACK UP the keystore + passwords. Losing them = you cannot update the app on Play."
