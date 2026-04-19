# GitKrakenPatcher cross-platform publish script
# Usage: .\publish.ps1

$OutputDir = ".\publish"

if (Test-Path $OutputDir) {
    Remove-Item -Recurse -Force $OutputDir
}

$Runtimes = @(
    @{ Rid = "win-x64";     Name = "GitKrakenPatcher_Windows_x64.exe" },
    @{ Rid = "win-arm64";   Name = "GitKrakenPatcher_Windows_arm64.exe" },
    @{ Rid = "linux-x64";   Name = "GitKrakenPatcher_Linux_x64" },
    @{ Rid = "linux-arm64";  Name = "GitKrakenPatcher_Linux_arm64" },
    @{ Rid = "osx-x64";     Name = "GitKrakenPatcher_macOS_x64" },
    @{ Rid = "osx-arm64";   Name = "GitKrakenPatcher_macOS_arm64" }
)

foreach ($rt in $Runtimes) {
    $rid = $rt.Rid
    $name = $rt.Name
    Write-Host "Publishing $rid ..." -ForegroundColor Cyan

    dotnet publish -c Release -r $rid -o "$OutputDir\$rid" --self-contained true /p:PublishSingleFile=true /p:PublishTrimmed=true

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FAILED: $rid" -ForegroundColor Red
        continue
    }

    $ext = if ($rid.StartsWith("win")) { ".exe" } else { "" }
    $srcExe = Join-Path "$OutputDir\$rid" "GitKrakenPatcher$ext"
    $destExe = Join-Path $OutputDir $name

    if (Test-Path $srcExe) {
        Copy-Item $srcExe $destExe
        Write-Host "  OK: $name" -ForegroundColor Green
    }

    Remove-Item -Recurse -Force "$OutputDir\$rid"
}

Write-Host "`nDone! Output: $OutputDir" -ForegroundColor Green
