#!/usr/bin/env bash
#
# Sets up a no-sudo, user-space Android build toolchain (JDK 21 + Android SDK)
# so you can build the Pomo APK from the Capacitor project.
#
# Usage:
#   bash scripts/setup-android.sh
#   # then:  npm run android:apk
#
# Everything installs under your home directory; nothing is installed system-wide.
set -euo pipefail

JDK_DIR="${JDK_DIR:-$HOME/.local/jdk21}"
SDK_DIR="${SDK_DIR:-$HOME/Android/Sdk}"
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
JDK_URL="https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse"

# These must match android/variables.gradle (Capacitor 7 -> SDK 35).
PLATFORM="platforms;android-35"
BUILD_TOOLS="build-tools;35.0.0"

log() { printf '\n\033[1;36m== %s ==\033[0m\n' "$1"; }

# 1) JDK 21 ------------------------------------------------------------------
if "$JDK_DIR/bin/java" -version >/dev/null 2>&1; then
  log "JDK already present at $JDK_DIR"
else
  log "Downloading Temurin JDK 21 -> $JDK_DIR"
  tmp="$(mktemp -d)"
  curl -L -s -o "$tmp/jdk.tar.gz" "$JDK_URL"
  mkdir -p "$JDK_DIR"
  tar -xzf "$tmp/jdk.tar.gz" -C "$JDK_DIR" --strip-components=1
  rm -rf "$tmp"
fi
export JAVA_HOME="$JDK_DIR"
export PATH="$JAVA_HOME/bin:$PATH"
java -version

# 2) Android command-line tools ---------------------------------------------
if [ -x "$SDK_DIR/cmdline-tools/latest/bin/sdkmanager" ]; then
  log "Android command-line tools already present"
else
  log "Downloading Android command-line tools -> $SDK_DIR"
  tmp="$(mktemp -d)"
  curl -L -s -o "$tmp/cmdtools.zip" "$CMDLINE_TOOLS_URL"
  mkdir -p "$SDK_DIR/cmdline-tools"
  rm -rf "$SDK_DIR/cmdline-tools/tmp" "$SDK_DIR/cmdline-tools/latest"
  unzip -q "$tmp/cmdtools.zip" -d "$SDK_DIR/cmdline-tools/tmp"
  mv "$SDK_DIR/cmdline-tools/tmp/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"
  rmdir "$SDK_DIR/cmdline-tools/tmp"
  rm -rf "$tmp"
fi
export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="$SDK_DIR"
export PATH="$SDK_DIR/cmdline-tools/latest/bin:$SDK_DIR/platform-tools:$PATH"

# 3) SDK packages + licenses -------------------------------------------------
log "Accepting SDK licenses"
yes | sdkmanager --licenses >/dev/null 2>&1 || true
log "Installing platform-tools, $PLATFORM, $BUILD_TOOLS"
sdkmanager "platform-tools" "$PLATFORM" "$BUILD_TOOLS"

# 4) Point the Gradle project at the SDK ------------------------------------
if [ -d "$(dirname "$0")/../android" ]; then
  echo "sdk.dir=$SDK_DIR" > "$(dirname "$0")/../android/local.properties"
  log "Wrote android/local.properties"
fi

cat <<EOF

\033[1;32mDone.\033[0m Add these to your shell (and reuse for every build):

  export JAVA_HOME="$JDK_DIR"
  export ANDROID_HOME="$SDK_DIR"
  export PATH="\$JAVA_HOME/bin:\$ANDROID_HOME/platform-tools:\$PATH"

Then build the APK:

  npm run android:apk
  # output: android/app/build/outputs/apk/debug/app-debug.apk
EOF
