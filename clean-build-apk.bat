@echo off
echo Cleaning and rebuilding WooOrderManager APK...
echo.

echo Step 1: Cleaning previous builds...
cd android
call gradlew.bat clean
cd ..

echo Step 2: Building web application...
call npm run build
if %errorlevel% neq 0 (
    echo Failed to build web application
    pause
    exit /b 1
)

echo Step 3: Syncing with Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo Failed to sync with Android
    pause
    exit /b 1
)

echo Step 4: Building Android APK...
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
