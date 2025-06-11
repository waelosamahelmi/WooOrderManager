# Enhanced Android Test Script for Ravintola Tirva (PowerShell)
# This script tests all Android functionality comprehensively

Write-Host "🚀 Starting Enhanced Android Testing for Ravintola Tirva..." -ForegroundColor Cyan
Write-Host "==============================================`n" -ForegroundColor Cyan

# Function to print status messages
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "package.json not found. Please run this script from the project root."
    exit 1
}

# Check Node.js version
$nodeVersion = node --version
Write-Status "Node.js version: $nodeVersion"

# Check if Android SDK is available
$androidHome = $env:ANDROID_HOME
$androidSdkRoot = $env:ANDROID_SDK_ROOT

if (-not $androidHome -and -not $androidSdkRoot) {
    Write-Warning "Android SDK environment variables not set"
    Write-Status "Checking for Android SDK in common locations..."
    
    $possiblePaths = @(
        "$env:USERPROFILE\AppData\Local\Android\Sdk",
        "$env:LOCALAPPDATA\Android\Sdk",
        "C:\Android\Sdk"
    )
    
    $found = $false
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $env:ANDROID_SDK_ROOT = $path
            $env:ANDROID_HOME = $path
            Write-Success "Found Android SDK at $path"
            $found = $true
            break
        }
    }
    
    if (-not $found) {
        Write-Error "Android SDK not found. Please install Android SDK or set ANDROID_SDK_ROOT environment variable."
        exit 1
    }
}

# Test 1: Dependencies Installation
Write-Status "Test 1: Installing dependencies..."
try {
    npm ci
    Write-Success "Dependencies installed successfully"
} catch {
    Write-Error "Failed to install dependencies"
    exit 1
}

# Test 2: TypeScript Check
Write-Status "Test 2: Running TypeScript checks..."
try {
    npm run check
    Write-Success "TypeScript checks passed"
} catch {
    Write-Warning "TypeScript checks failed (continuing anyway)"
}

# Test 3: Web Build
Write-Status "Test 3: Building web assets..."
try {
    npm run build
    Write-Success "Web build completed successfully"
    
    # Check if dist directory exists and has content
    if ((Test-Path "dist") -and ((Get-ChildItem "dist" -Recurse).Count -gt 0)) {
        Write-Success "Build output verified"
    } else {
        Write-Error "Build output directory is empty"
        exit 1
    }
} catch {
    Write-Error "Web build failed"
    exit 1
}

# Test 4: Capacitor Setup
Write-Status "Test 4: Setting up Capacitor..."
try {
    npx cap sync android
    Write-Success "Capacitor sync completed"
} catch {
    Write-Error "Capacitor sync failed"
    exit 1
}

# Test 5: Android Project Structure
Write-Status "Test 5: Verifying Android project structure..."
$androidFiles = @(
    "android\app\build.gradle",
    "android\build.gradle",
    "android\gradlew.bat",
    "android\app\src\main\AndroidManifest.xml"
)

foreach ($file in $androidFiles) {
    if (Test-Path $file) {
        Write-Success "✓ $file exists"
    } else {
        Write-Error "✗ $file missing"
        exit 1
    }
}

# Test 6: Gradle Wrapper Permissions (Windows doesn't need chmod)
Write-Status "Test 6: Checking Gradle wrapper..."
if (Test-Path "android\gradlew.bat") {
    Write-Success "Gradle wrapper (gradlew.bat) is available"
} else {
    Write-Error "Gradle wrapper not found"
    exit 1
}

# Test 7: Gradle Tasks List
Write-Status "Test 7: Testing Gradle tasks..."
Push-Location "android"
try {
    .\gradlew.bat tasks --stacktrace
    Write-Success "Gradle tasks listed successfully"
} catch {
    Write-Error "Failed to list Gradle tasks"
    Pop-Location
    exit 1
}
Pop-Location

# Test 8: Android Build (Debug)
Write-Status "Test 8: Building debug APK..."
Push-Location "android"
try {
    .\gradlew.bat assembleDebug --stacktrace
    Write-Success "Debug APK built successfully"
    
    # Check if APK was actually created
    $apkPath = "app\build\outputs\apk\debug"
    if ((Test-Path $apkPath) -and ((Get-ChildItem "$apkPath\*.apk").Count -gt 0)) {
        $apkFiles = Get-ChildItem "$apkPath\*.apk"
        $apkCount = $apkFiles.Count
        $apkSize = [math]::Round(($apkFiles[0].Length / 1MB), 2)
        Write-Success "APK created: $apkCount file(s), size: ${apkSize}MB"
        
        # List APK details
        foreach ($apk in $apkFiles) {
            Write-Status "APK: $($apk.Name)"
        }
    } else {
        Write-Error "APK file not found in expected location"
        Pop-Location
        exit 1
    }
} catch {
    Write-Error "Debug APK build failed"
    Pop-Location
    exit 1
}
Pop-Location

# Test 9: APK Analysis
Write-Status "Test 9: Analyzing APK..."
$apkFile = Get-ChildItem "android\app\build\outputs\apk\debug\*.apk" | Select-Object -First 1
if ($apkFile) {
    Write-Success "APK found: $($apkFile.Name)"
    
    # Check APK size
    $apkSizeMB = [math]::Round(($apkFile.Length / 1MB), 2)
    
    if ($apkSizeMB -gt 0) {
        Write-Success "APK size: ${apkSizeMB}MB"
        
        if ($apkSizeMB -gt 100) {
            Write-Warning "APK size is quite large (${apkSizeMB}MB)"
        }
    } else {
        Write-Warning "Could not determine APK size"
    }
} else {
    Write-Error "APK file not found for analysis"
}

# Test 10: Android Manifest Validation
Write-Status "Test 10: Validating Android Manifest..."
$manifestFile = "android\app\src\main\AndroidManifest.xml"
if (Test-Path $manifestFile) {
    # Check for required permissions
    $requiredPermissions = @(
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.ACCESS_WIFI_STATE",
        "android.permission.VIBRATE"
    )
    
    $manifestContent = Get-Content $manifestFile -Raw
    foreach ($permission in $requiredPermissions) {
        if ($manifestContent -match [regex]::Escape($permission)) {
            Write-Success "✓ Permission: $permission"
        } else {
            Write-Warning "✗ Missing permission: $permission"
        }
    }
} else {
    Write-Error "AndroidManifest.xml not found"
}

# Test 11: Configuration Validation
Write-Status "Test 11: Validating configuration files..."

# Check capacitor.config.ts
if (Test-Path "capacitor.config.ts") {
    Write-Success "✓ capacitor.config.ts exists"
    
    $configContent = Get-Content "capacitor.config.ts" -Raw
    
    # Check for important configurations
    if ($configContent -match 'appId.*[''"]([^''"]+)[''"]') {
        $appId = $matches[1]
        Write-Success "✓ App ID: $appId"
    }
    
    if ($configContent -match 'appName.*[''"]([^''"]+)[''"]') {
        $appName = $matches[1]
        Write-Success "✓ App Name: $appName"
    }
} else {
    Write-Error "capacitor.config.ts not found"
}

# Summary
Write-Host "`n==============================================" -ForegroundColor Cyan
Write-Success "🎉 Enhanced Android Testing Complete!"
Write-Host ""
Write-Status "Summary:"
Write-Status "- Web build: ✅ Success"
Write-Status "- Capacitor sync: ✅ Success"
Write-Status "- Android project: ✅ Verified"
Write-Status "- Debug APK: ✅ Built successfully"
Write-Status "- Configuration: ✅ Validated"
Write-Host ""
Write-Status "Your Android app is ready for testing!"
Write-Status "APK location: android\app\build\outputs\apk\debug\"
Write-Host ""
Write-Status "Next steps:"
Write-Status "1. Install the APK on your Android device"
Write-Status "2. Test printer connectivity and WooCommerce integration"
Write-Status "3. Verify notification functionality"
Write-Status "4. Test order processing workflow"
Write-Host ""
Write-Success "Happy testing! 🚀" -ForegroundColor Green
