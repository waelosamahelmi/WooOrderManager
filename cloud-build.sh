#!/bin/bash

# Cloud Android APK Builder
# This script sets up Android SDK in any cloud environment and builds your APK

set -e

echo "🌐 Setting up Cloud Android Build Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in cloud environment
if [ -n "$GITPOD_WORKSPACE_ID" ]; then
    print_status "Running in Gitpod"
    CLOUD_ENV="gitpod"
elif [ -n "$REPL_ID" ]; then
    print_status "Running in Replit"
    CLOUD_ENV="replit"
elif [ -n "$CODESPACE_NAME" ]; then
    print_status "Running in GitHub Codespaces"
    CLOUD_ENV="codespaces"
else
    print_status "Running in generic cloud environment"
    CLOUD_ENV="generic"
fi

# Install Java if not present
if ! command -v java &> /dev/null; then
    print_status "Installing Java JDK..."
    if [ "$CLOUD_ENV" = "replit" ]; then
        # Replit-specific Java installation
        nix-env -iA nixpkgs.openjdk17
    else
        # Generic installation
        sudo apt-get update
        sudo apt-get install -y openjdk-17-jdk
    fi
fi

# Set up Android SDK
print_status "Setting up Android SDK..."
if [ ! -d "android-sdk" ]; then
    print_status "Downloading Android Command Line Tools..."
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-8512546_latest.zip
    unzip -q commandlinetools-linux-8512546_latest.zip
    mkdir -p android-sdk/cmdline-tools
    mv cmdline-tools android-sdk/cmdline-tools/latest
    rm commandlinetools-linux-8512546_latest.zip
fi

# Set environment variables
export ANDROID_HOME="$PWD/android-sdk"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"

# Accept licenses and install required packages
print_status "Installing Android SDK packages..."
yes | sdkmanager --licenses > /dev/null 2>&1 || true
sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0" > /dev/null

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm install

# Build web application
print_status "Building web application..."
npm run build

# Sync with Capacitor
print_status "Syncing with Capacitor..."
npx cap sync android

# Build Android APK
print_status "Building Android APK..."
cd android
chmod +x gradlew
./gradlew assembleDebug

# Check if APK was built successfully
APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    print_status "✅ APK built successfully!"
    print_status "📱 APK location: android/$APK_PATH"
    
    # Get file size
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    print_status "📦 APK size: $APK_SIZE"
    
    # Create download link for cloud environments
    if [ "$CLOUD_ENV" = "gitpod" ]; then
        print_status "🔗 Download APK: $(gp url 8000)/android/$APK_PATH"
    elif [ "$CLOUD_ENV" = "replit" ]; then
        print_status "🔗 APK available in the file explorer: android/$APK_PATH"
    else
        print_status "🔗 APK available at: android/$APK_PATH"
    fi
    
    echo ""
    echo "🎉 Your WooOrderManager APK is ready!"
    echo "📲 Install it on your Android device to test."
    
else
    print_error "❌ APK build failed!"
    exit 1
fi
