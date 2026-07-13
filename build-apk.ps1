# build-apk.ps1
# Direct compilation on C: drive to bypass virtual filesystem lock / EPERM issues on A: drive

$tempDir = "C:\Users\Admin\AppData\Local\Temp\airsync-android"
if (Test-Path $tempDir) {
    try {
        Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
    } catch {}
}
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "Copying codebase to C: drive temp folder..." -ForegroundColor Cyan
# Copy folders recursively, excluding node_modules, out, dist, .git
Copy-Item -Path "android" -Destination "$tempDir\android" -Recurse -Force
Copy-Item -Path "server" -Destination "$tempDir\server" -Recurse -Force
Copy-Item -Path "src" -Destination "$tempDir\src" -Recurse -Force
Copy-Item -Path "package.json" -Destination "$tempDir\" -Force
Copy-Item -Path "package-lock.json" -Destination "$tempDir\" -Force
Copy-Item -Path "vite.config.js" -Destination "$tempDir\" -Force
Copy-Item -Path "tailwind.config.js" -Destination "$tempDir\" -Force
Copy-Item -Path "postcss.config.js" -Destination "$tempDir\" -Force
Copy-Item -Path "index.html" -Destination "$tempDir\" -Force
Copy-Item -Path "main.js" -Destination "$tempDir\" -Force
Copy-Item -Path "preload.js" -Destination "$tempDir\" -Force
Copy-Item -Path "capacitor.config.json" -Destination "$tempDir\" -Force

try {
    # Set CWD to temp folder
    Push-Location $tempDir

    Write-Host "Installing npm dependencies on C: drive..." -ForegroundColor Cyan
    npm install

    Write-Host "Compiling frontend assets..." -ForegroundColor Cyan
    npm run electron-build

    Write-Host "Syncing web assets to Capacitor Android project..." -ForegroundColor Cyan
    npx cap sync android

    Write-Host "Building Android APK using Gradle..." -ForegroundColor Cyan
    Set-Location "$tempDir\android"
    
    # Run assembleDebug
    cmd.exe /c "gradlew.bat assembleDebug"

    # Copy output APK back
    $apkPath = "$tempDir\android\app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $apkPath) {
        Pop-Location # Go back to original A: drive path
        $outDir = Join-Path (Get-Location) "out"
        if (!(Test-Path $outDir)) {
            New-Item -ItemType Directory -Path $outDir -Force | Out-Null
        }
        Copy-Item -Path $apkPath -Destination "$outDir\AirSync-debug.apk" -Force
        Write-Host "APK Build successful! Saved to out/AirSync-debug.apk" -ForegroundColor Green
    } else {
        Write-Error "APK file not found. Gradle compilation might have failed."
    }
}
catch {
    Write-Error "An error occurred during build: $_"
}
finally {
    # Ensure we return to original path
    if ((Get-Location).Path -eq $tempDir -or (Get-Location).Path -eq "$tempDir\android") {
        Pop-Location
    }
}
