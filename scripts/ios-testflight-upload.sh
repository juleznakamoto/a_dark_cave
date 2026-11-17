#!/usr/bin/env bash
# Archive the iOS app and upload it to TestFlight.
# The GitHub workflow only runs this when "upload" is checked.
# It refuses to start until the signing secrets exist. It never prints them.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/ios/App"
BUNDLE_ID="com.adarkcave.game"
PROFILE_NAME="A Dark Cave App Store"

missing=()
require() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    missing+=("$name")
  fi
}

require APP_STORE_CONNECT_KEY_ID
require APP_STORE_CONNECT_ISSUER_ID
require APP_STORE_CONNECT_API_KEY_P8
require APPLE_TEAM_ID
require IOS_DISTRIBUTION_CERT_P12_BASE64
require IOS_DISTRIBUTION_CERT_PASSWORD
require IOS_PROVISIONING_PROFILE_BASE64

if ((${#missing[@]} > 0)); then
  echo "TestFlight upload needs these GitHub secrets:"
  printf '  - %s\n' "${missing[@]}"
  echo "Create them in App Store Connect after the Apple Developer account exists."
  exit 1
fi

KEY_DIR="$HOME/.appstoreconnect/private_keys"
mkdir -p "$KEY_DIR"
printf '%s' "$APP_STORE_CONNECT_API_KEY_P8" > "$KEY_DIR/AuthKey_${APP_STORE_CONNECT_KEY_ID}.p8"
chmod 600 "$KEY_DIR/AuthKey_${APP_STORE_CONNECT_KEY_ID}.p8"

CERT_PATH="$(mktemp)"
PROFILE_PATH="$APP_DIR/build/ADarkCave.mobileprovision"
mkdir -p "$APP_DIR/build"
printf '%s' "$IOS_DISTRIBUTION_CERT_P12_BASE64" | base64 -D > "$CERT_PATH"
printf '%s' "$IOS_PROVISIONING_PROFILE_BASE64" | base64 -D > "$PROFILE_PATH"

# The runner login keychain rejects OpenSSL 3 p12 files and is locked for
# unattended import. A temporary keychain accepts a legacy p12.
KEYCHAIN_PATH="$APP_DIR/build/signing.keychain-db"
KEYCHAIN_PASS="$(openssl rand -hex 16)"
security create-keychain -p "$KEYCHAIN_PASS" "$KEYCHAIN_PATH"
security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASS" "$KEYCHAIN_PATH"
security import "$CERT_PATH" -k "$KEYCHAIN_PATH" -P "$IOS_DISTRIBUTION_CERT_PASSWORD" -f pkcs12 -T /usr/bin/codesign -T /usr/bin/security
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASS" "$KEYCHAIN_PATH"
security list-keychains -d user -s "$KEYCHAIN_PATH"
rm -f "$CERT_PATH"

mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"
security cms -D -i "$PROFILE_PATH" > "$APP_DIR/build/profile.plist"
PROFILE_UUID="$(/usr/libexec/PlistBuddy -c 'Print UUID' "$APP_DIR/build/profile.plist")"
cp "$PROFILE_PATH" "$HOME/Library/MobileDevice/Provisioning Profiles/${PROFILE_UUID}.mobileprovision"

EXPORT_PLIST="$APP_DIR/build/ExportOptions.plist"
cat > "$EXPORT_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>teamID</key>
  <string>${APPLE_TEAM_ID}</string>
  <key>signingStyle</key>
  <string>manual</string>
  <key>uploadSymbols</key>
  <true/>
  <key>provisioningProfiles</key>
  <dict>
    <key>${BUNDLE_ID}</key>
    <string>${PROFILE_NAME}</string>
  </dict>
</dict>
</plist>
EOF

cd "$APP_DIR"
xcodebuild \
  -project App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$APP_DIR/build/App.xcarchive" \
  CODE_SIGN_STYLE=Manual \
  CODE_SIGN_IDENTITY="Apple Distribution" \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  PROVISIONING_PROFILE_SPECIFIER="$PROFILE_NAME" \
  OTHER_CODE_SIGN_FLAGS="--keychain $KEYCHAIN_PATH" \
  archive

xcodebuild \
  -exportArchive \
  -archivePath "$APP_DIR/build/App.xcarchive" \
  -exportPath "$APP_DIR/build/export" \
  -exportOptionsPlist "$EXPORT_PLIST"

xcrun altool --upload-app \
  --type ios \
  --file "$APP_DIR/build/export/App.ipa" \
  --apiKey "$APP_STORE_CONNECT_KEY_ID" \
  --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID"
