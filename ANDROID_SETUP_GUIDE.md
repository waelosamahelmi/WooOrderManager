# Android APK Build Setup Guide

This guide will help you set up the Android development environment and build your WooOrderManager app as an APK.

## Prerequisites Installation

### 1. Install Java Development Kit (JDK)
- Download and install JDK 11 or 17 from: https://adoptium.net/
- Choose the Windows x64 installer
- During installation, make sure to check "Add to PATH"
- Verify installation by opening PowerShell and running: `java -version`

### 2. Install Android Studio
- Download Android Studio from: https://developer.android.com/studio
- Install with default settings
- During first launch, go through the setup wizard and install:
  - Android SDK
  - Android SDK Platform-Tools
  - Android SDK Build-Tools
  - Android Emulator (optional for testing)

### 3. Set Environment Variables
Add these to your Windows environment variables:

```
JAVA_HOME = C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot (adjust path as needed)
ANDROID_HOME = C:\Users\%USERNAME%\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT = C:\Users\%USERNAME%\AppData\Local\Android\Sdk
```

Add to your PATH:
```
%JAVA_HOME%\bin
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
%ANDROID_HOME%\platform-tools
```

## Building the APK

### Option 1: Using Android Studio (Recommended)
1. Open Android Studio
2. Open the project folder: `WooOrderManager\android`
3. Wait for Gradle sync to complete
4. Go to Build → Build Bundle(s) / APK(s) → Build APK(s)
5. The APK will be generated in: `android\app\build\outputs\apk\debug\app-debug.apk`

### Option 2: Using Command Line
1. Open PowerShell as Administrator
2. Navigate to your project:
   ```powershell
   cd "c:\Users\Owner\Downloads\WooOrderManager\WooOrderManager"
   ```
3. Build the web app:
   ```powershell
   npm run build
   ```
4. Sync with Android:
   ```powershell
   npx cap sync android
   ```
5. Build the APK:
   ```powershell
   cd android
   .\gradlew.bat assembleDebug
   ```

## Installing the APK on Android Device

### Enable Developer Options on your Android device:
1. Go to Settings → About Phone
2. Tap "Build Number" 7 times
3. Go back to Settings → Developer Options
4. Enable "USB Debugging"
5. Enable "Install via USB"

### Install the APK:
1. Connect your Android device via USB
2. Copy the APK file to your device
3. Open the APK file on your device and install
4. Or use ADB: `adb install app-debug.apk`

## Troubleshooting

### Common Issues:

1. **JAVA_HOME not found**: Make sure Java is properly installed and environment variables are set
2. **Android SDK not found**: Verify ANDROID_HOME and ANDROID_SDK_ROOT are correctly set
3. **Gradle build fails**: Try running `.\gradlew.bat clean` first
4. **App crashes on device**: Check Android logs with `adb logcat`

### If you encounter build errors:
1. Clear Gradle cache: `.\gradlew.bat clean`
2. Rebuild: `.\gradlew.bat assembleDebug`
3. If still failing, delete `android\.gradle` folder and rebuild

## App Configuration

The app is configured with:
- App ID: `com.ravintola.tirva.app`
- App Name: `Ravintola Tirva`
- Permissions: Internet, Network State, Notifications, Wake Lock, Vibrate

## Next Steps After Installation

1. The APK will work as a standalone app on Android
2. For production use, you'll want to build a release APK (requires signing)
3. Consider adding app icons and splash screens for a professional look
4. Test all features including notifications and offline functionality

## Production Release (Optional)

To create a signed release APK:
1. Generate a keystore file
2. Configure signing in `android/app/build.gradle`
3. Build with: `.\gradlew.bat assembleRelease`
