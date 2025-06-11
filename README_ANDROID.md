# WooOrderManager Android APK

Your WooOrderManager app has been successfully converted for Android! This document explains what has been set up and how to build your APK.

## ✅ What's Been Configured

### 🔧 Capacitor Setup
- ✅ Capacitor core and Android platform installed
- ✅ App configured with proper Android settings
- ✅ Package ID: `com.ravintola.tirva.app`
- ✅ App Name: `Ravintola Tirva`

### 📱 Android Features Added
- ✅ **Push Notifications** - For order alerts
- ✅ **Local Notifications** - For system notifications
- ✅ **Splash Screen** - Professional app loading screen
- ✅ **Proper Permissions** - Internet, notifications, wake lock, vibrate

### 🛠 Build Scripts Created
- `build-apk.bat` - Quick build script
- `clean-build-apk.bat` - Clean build script for troubleshooting

## 🚀 Quick Start (After Installing Prerequisites)

1. **Install Android development environment** (see ANDROID_SETUP_GUIDE.md)
2. **Run the build script**:
   ```
   build-apk.bat
   ```
3. **Find your APK**: `android\app\build\outputs\apk\debug\app-debug.apk`
4. **Install on Android device** (see guide for instructions)

## 📁 Project Structure

```
WooOrderManager/
├── android/                    # Native Android project
│   ├── app/
│   │   └── build/
│   │       └── outputs/
│   │           └── apk/
│   │               └── debug/
│   │                   └── app-debug.apk  # Your APK file!
├── capacitor.config.ts         # Capacitor configuration
├── build-apk.bat              # Build script
├── clean-build-apk.bat        # Clean build script
└── ANDROID_SETUP_GUIDE.md     # Detailed setup instructions
```

## 🎯 App Features in Android

Your Android app will have all the web app features:
- ✅ Order management and processing
- ✅ Real-time WebSocket notifications
- ✅ Print functionality (via browser print)
- ✅ Sound notifications for new orders
- ✅ Touch-optimized interface
- ✅ Offline PWA capabilities
- ✅ Native Android notifications

## 🔔 Notification Behavior

The app supports both:
- **Web notifications** (from your existing service worker)
- **Native Android notifications** (via Capacitor plugins)

## 📋 Installation Requirements

### For Building APK:
1. Java JDK 11 or 17
2. Android Studio + Android SDK
3. Environment variables configured

### For Installing APK:
1. Android device with developer options enabled
2. "Install from unknown sources" permission
3. Minimum Android version: 7.0 (API level 24)

## 🛠 Troubleshooting

### Build Issues:
- Run `clean-build-apk.bat` if regular build fails
- Check environment variables are set correctly
- Ensure Android SDK is properly installed

### App Issues:
- Check Android device logs: `adb logcat`
- Verify network connectivity for API calls
- Test with different Android devices/versions

## 🔄 Development Workflow

1. **Make changes** to your web app (`client/src/`)
2. **Test locally** with `npm run dev`
3. **Build for Android**:
   ```
   npm run build
   npx cap sync android
   cd android
   gradlew.bat assembleDebug
   ```
4. **Install updated APK** on device

## 🎨 Customization Options

### App Icon:
- Replace files in `android/app/src/main/res/mipmap-*/`
- Use Android Studio's Image Asset Studio for best results

### Splash Screen:
- Modify colors in `capacitor.config.ts`
- Add custom splash images in `android/app/src/main/res/drawable-*/`

### App Name:
- Change in `capacitor.config.ts` and rebuild
- Update in `android/app/src/main/res/values/strings.xml`

## 📈 Next Steps

1. **Test thoroughly** on different Android devices
2. **Create a signed release APK** for production deployment
3. **Consider publishing** to Google Play Store (optional)
4. **Set up automated builds** with GitHub Actions (optional)

## 🆘 Need Help?

- Check `ANDROID_SETUP_GUIDE.md` for detailed setup instructions
- Common Android issues: https://capacitorjs.com/docs/android/troubleshooting
- Capacitor documentation: https://capacitorjs.com/docs

---

**Your restaurant order management system is now ready for Android! 🎉**
