@echo off
echo Building WooOrderManager APK...
echo.
echo 💡 TIP: For easier building without local Android Studio setup,
echo    consider using cloud platforms like GitHub Actions, Gitpod, or Replit!
echo    See QUICK_CLOUD_BUILD.md for details.
echo.

echo Step 1: Building web application...
call npm run build
if %errorlevel% neq 0 (
    echo Failed to build web application
    pause
    exit /b 1
)

echo Step 2: Syncing with Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo Failed to sync with Android
    pause
    exit /b 1
)

echo Step 3: Building Android APK...
cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo Failed to build APK
    pause
    exit /b 1
)

echo.
echo ✅ APK built successfully!
echo Location: android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
