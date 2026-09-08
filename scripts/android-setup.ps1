$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location $projectRoot
$previousEnv = @{}
foreach ($name in @('JAVA_HOME','ANDROID_HOME','ANDROID_USER_HOME')) { $previousEnv[$name] = [Environment]::GetEnvironmentVariable($name,'Process') }
try {
    New-Item -ItemType Directory -Force tools/downloads | Out-Null
    $downloads = @(
        @{Url='https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip'; File='tools/downloads/android-cli.zip'; Sha='90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a'},
        @{Url='https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk_x64_windows_hotspot_21.0.12.1_1.zip'; File='tools/downloads/jdk.zip'; Sha='f9d6e191ab098c0d416e7d588a24420a8621cd2f4720dab2459b8b7b2d2d8b4e'}
    )
    foreach ($item in $downloads) {
        if (!(Test-Path $item.File)) { & curl.exe -L --fail --retry 3 --max-time 600 $item.Url -o $item.File; if ($LASTEXITCODE -ne 0) {throw 'Tool download failed.'} }
        if ((Get-FileHash $item.File -Algorithm SHA256).Hash.ToLower() -ne $item.Sha) { throw "Checksum mismatch: $($item.File)" }
    }
    if (!(Test-Path tools/jdk)) { Expand-Archive tools/downloads/jdk.zip tools/jdk }
    if (!(Test-Path tools/android-sdk/cmdline-tools/latest/bin/sdkmanager.bat)) {
        Expand-Archive tools/downloads/android-cli.zip tools/android-sdk -Force
        New-Item -ItemType Directory -Force tools/android-sdk/cmdline-tools/latest | Out-Null
        Get-ChildItem tools/android-sdk/cmdline-tools | Where-Object Name -ne latest | Move-Item -Destination tools/android-sdk/cmdline-tools/latest
    }
    $env:JAVA_HOME = (Get-ChildItem tools/jdk -Directory | Select-Object -First 1).FullName
    $env:ANDROID_HOME = Join-Path $projectRoot 'tools/android-sdk'
    $env:ANDROID_USER_HOME = Join-Path $projectRoot '.android-home'
    1..20 | ForEach-Object {'y'} | & tools/android-sdk/cmdline-tools/latest/bin/sdkmanager.bat --sdk_root=$env:ANDROID_HOME 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'
    if ($LASTEXITCODE -ne 0) { throw 'Android SDK installation failed.' }
} finally {
    foreach ($name in $previousEnv.Keys) { [Environment]::SetEnvironmentVariable($name,$previousEnv[$name],'Process') }
    Pop-Location
}
