# package-app.ps1
# Direct compilation on C: drive to bypass virtual filesystem lock / EPERM issues on A: drive

$appDataTemp = "C:\Users\Admin\AppData\Local\Temp\airsync-builder"
if (Test-Path $appDataTemp) {
    try {
        Remove-Item -Recurse -Force $appDataTemp -ErrorAction SilentlyContinue
    } catch {}
}
New-Item -ItemType Directory -Path $appDataTemp -Force | Out-Null

# Read package.json
$jsonPath = Resolve-Path "package.json"
$json = Get-Content $jsonPath -Raw | ConvertFrom-Json

# Backup original output directory
$origOutput = $json.build.directories.output

# Override output to C: temp folder
$json.build.directories.output = "$appDataTemp\out"
$jsonString = $json | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($jsonPath, $jsonString)

try {
    # Run build & package
    Write-Host "Compiling frontend assets..." -ForegroundColor Cyan
    npm run electron-build
    
    Write-Host "Running electron-builder packaging on C: drive..." -ForegroundColor Cyan
    npx electron-builder --win
    
    # Copy output back to project dir
    Write-Host "Copying compiled installers back to project output directory..." -ForegroundColor Cyan
    $projectOut = Join-Path (Get-Location) "out"
    if (Test-Path $projectOut) {
        try {
            Remove-Item -Recurse -Force $projectOut -ErrorAction SilentlyContinue
        } catch {}
    }
    New-Item -ItemType Directory -Path $projectOut -Force | Out-Null
    Copy-Item -Path "$appDataTemp\out\*" -Destination $projectOut -Recurse -Force
    Write-Host "Build complete! Output saved to project /out directory." -ForegroundColor Green
}
finally {
    # Restore package.json
    $json.build.directories.output = $origOutput
    $jsonStringRestored = $json | ConvertTo-Json -Depth 100
    [System.IO.File]::WriteAllText($jsonPath, $jsonStringRestored)
}
