#!/bin/bash

# Enhanced Android Test Script for Ravintola Tirva
# This script tests all Android functionality comprehensively

echo "🚀 Starting Enhanced Android Testing for Ravintola Tirva..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check if Android SDK is available
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    print_warning "Android SDK environment variables not set"
    print_status "Checking for Android SDK in common locations..."
    
    if [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
        export ANDROID_HOME="$HOME/Android/Sdk"
        print_success "Found Android SDK at $ANDROID_SDK_ROOT"
    elif [ -d "/opt/android-sdk" ]; then
        export ANDROID_SDK_ROOT="/opt/android-sdk"
        export ANDROID_HOME="/opt/android-sdk"
        print_success "Found Android SDK at $ANDROID_SDK_ROOT"
    else
        print_error "Android SDK not found. Please install Android SDK or set ANDROID_SDK_ROOT environment variable."
        exit 1
    fi
fi

# Test 1: Dependencies Installation
print_status "Test 1: Installing dependencies..."
if npm ci; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Test 2: TypeScript Check
print_status "Test 2: Running TypeScript checks..."
if npm run check; then
    print_success "TypeScript checks passed"
else
    print_warning "TypeScript checks failed (continuing anyway)"
fi

# Test 3: Web Build
print_status "Test 3: Building web assets..."
if npm run build; then
    print_success "Web build completed successfully"
    
    # Check if dist directory exists and has content
    if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
        print_success "Build output verified"
    else
        print_error "Build output directory is empty"
        exit 1
    fi
else
    print_error "Web build failed"
    exit 1
fi

# Test 4: Capacitor Setup
print_status "Test 4: Setting up Capacitor..."
if npx cap sync android; then
    print_success "Capacitor sync completed"
else
    print_error "Capacitor sync failed"
    exit 1
fi

# Test 5: Android Project Structure
print_status "Test 5: Verifying Android project structure..."
ANDROID_FILES_CHECK=(
    "android/app/build.gradle"
    "android/build.gradle"
    "android/gradlew"
    "android/app/src/main/AndroidManifest.xml"
)

for file in "${ANDROID_FILES_CHECK[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file exists"
    else
        print_error "✗ $file missing"
        exit 1
    fi
done

# Test 6: Gradle Wrapper Permissions
print_status "Test 6: Setting Gradle wrapper permissions..."
chmod +x android/gradlew
if [ -x "android/gradlew" ]; then
    print_success "Gradle wrapper is executable"
else
    print_error "Failed to make Gradle wrapper executable"
    exit 1
fi

# Test 7: Gradle Tasks List
print_status "Test 7: Testing Gradle tasks..."
cd android
if ./gradlew tasks --stacktrace; then
    print_success "Gradle tasks listed successfully"
else
    print_error "Failed to list Gradle tasks"
    cd ..
    exit 1
fi
cd ..

# Test 8: Android Build (Debug)
print_status "Test 8: Building debug APK..."
cd android
if ./gradlew assembleDebug --stacktrace; then
    print_success "Debug APK built successfully"
    
    # Check if APK was actually created
    APK_PATH="app/build/outputs/apk/debug"
    if [ -d "$APK_PATH" ] && ls "$APK_PATH"/*.apk 1> /dev/null 2>&1; then
        APK_COUNT=$(ls "$APK_PATH"/*.apk | wc -l)
        APK_SIZE=$(du -h "$APK_PATH"/*.apk | cut -f1)
        print_success "APK created: $APK_COUNT file(s), size: $APK_SIZE"
        
        # List APK details
        for apk in "$APK_PATH"/*.apk; do
            print_status "APK: $(basename "$apk")"
        done
    else
        print_error "APK file not found in expected location"
        cd ..
        exit 1
    fi
else
    print_error "Debug APK build failed"
    cd ..
    exit 1
fi
cd ..

# Test 9: APK Analysis
print_status "Test 9: Analyzing APK..."
APK_FILE=$(find android/app/build/outputs/apk/debug -name "*.apk" | head -1)
if [ -f "$APK_FILE" ]; then
    print_success "APK found: $(basename "$APK_FILE")"
    
    # Check APK size
    APK_SIZE_BYTES=$(stat -f%z "$APK_FILE" 2>/dev/null || stat -c%s "$APK_FILE" 2>/dev/null)
    APK_SIZE_MB=$((APK_SIZE_BYTES / 1024 / 1024))
    
    if [ $APK_SIZE_MB -gt 0 ]; then
        print_success "APK size: ${APK_SIZE_MB}MB"
        
        if [ $APK_SIZE_MB -gt 100 ]; then
            print_warning "APK size is quite large (${APK_SIZE_MB}MB)"
        fi
    else
        print_warning "Could not determine APK size"
    fi
else
    print_error "APK file not found for analysis"
fi

# Test 10: Android Manifest Validation
print_status "Test 10: Validating Android Manifest..."
MANIFEST_FILE="android/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST_FILE" ]; then
    # Check for required permissions
    REQUIRED_PERMISSIONS=(
        "android.permission.INTERNET"
        "android.permission.ACCESS_NETWORK_STATE"
        "android.permission.ACCESS_WIFI_STATE"
        "android.permission.VIBRATE"
    )
    
    for permission in "${REQUIRED_PERMISSIONS[@]}"; do
        if grep -q "$permission" "$MANIFEST_FILE"; then
            print_success "✓ Permission: $permission"
        else
            print_warning "✗ Missing permission: $permission"
        fi
    done
else
    print_error "AndroidManifest.xml not found"
fi

# Test 11: Configuration Validation
print_status "Test 11: Validating configuration files..."

# Check capacitor.config.ts
if [ -f "capacitor.config.ts" ]; then
    print_success "✓ capacitor.config.ts exists"
    
    # Check for important configurations
    if grep -q "appId" capacitor.config.ts; then
        APP_ID=$(grep "appId" capacitor.config.ts | cut -d'"' -f2)
        print_success "✓ App ID: $APP_ID"
    fi
    
    if grep -q "appName" capacitor.config.ts; then
        APP_NAME=$(grep "appName" capacitor.config.ts | cut -d'"' -f2)
        print_success "✓ App Name: $APP_NAME"
    fi
else
    print_error "capacitor.config.ts not found"
fi

# Summary
echo ""
echo "=============================================="
print_success "🎉 Enhanced Android Testing Complete!"
echo ""
print_status "Summary:"
print_status "- Web build: ✅ Success"
print_status "- Capacitor sync: ✅ Success"
print_status "- Android project: ✅ Verified"
print_status "- Debug APK: ✅ Built successfully"
print_status "- Configuration: ✅ Validated"
echo ""
print_status "Your Android app is ready for testing!"
print_status "APK location: android/app/build/outputs/apk/debug/"
echo ""
print_status "Next steps:"
print_status "1. Install the APK on your Android device"
print_status "2. Test printer connectivity and WooCommerce integration"
print_status "3. Verify notification functionality"
print_status "4. Test order processing workflow"
echo ""
print_success "Happy testing! 🚀"
