# Android Build Script
# This script builds the Android app without timeouts

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Saturday AI - Android Build" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Set-Location android

Write-Host "[1/2] Running assembleDebug..." -ForegroundColor Yellow
.\gradlew app:assembleDebug --no-daemon --no-configuration-cache --stacktrace

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "================================" -ForegroundColor Green
    Write-Host "BUILD SUCCESSFUL!" -ForegroundColor Green  
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "APK Location:" -ForegroundColor Cyan
    Write-Host "android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor White
    Write-Host ""
    Write-Host "[2/2] Installing on device..." -ForegroundColor Yellow
    
    Set-Location ..
    npx expo run:android --no-build-cache
    
} else {
    Write-Host ""
    Write-Host "================================" -ForegroundColor Red
    Write-Host "BUILD FAILED" -ForegroundColor Red
    Write-Host "================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check the error messages above" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Cyan
    Write-Host "1. Close Android Studio if running" -ForegroundColor White
    Write-Host "2. Stop any Gradle daemons: .\gradlew --stop" -ForegroundColor White  
    Write-Host "3. Clear cache: Remove-Item -Recurse .gradle" -ForegroundColor White
    Write-Host "4. Try again" -ForegroundColor White
}

Set-Location ..
