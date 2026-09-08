param([switch]$SkipWebBuild)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location $projectRoot
$previousEnv = @{}
foreach ($name in @('JAVA_HOME','ANDROID_HOME','ANDROID_USER_HOME','GRADLE_USER_HOME','GRADLE_OPTS')) { $previousEnv[$name] = [Environment]::GetEnvironmentVariable($name,'Process') }
try {
    $jdk = Get-ChildItem (Join-Path $projectRoot 'tools/jdk') -Directory | Select-Object -First 1
    if (!$jdk) { throw 'Run scripts/android-setup.ps1 first.' }
    $env:JAVA_HOME = $jdk.FullName
    $env:ANDROID_HOME = Join-Path $projectRoot 'tools/android-sdk'
    $env:ANDROID_USER_HOME = Join-Path $projectRoot '.android-home'
    $env:GRADLE_USER_HOME = Join-Path $projectRoot '.gradle-home'
    # Java does not automatically consume the shell HTTPS_PROXY used by curl.
    if ($env:HTTPS_PROXY) {
        $proxyUri = [uri]$env:HTTPS_PROXY
        if ($proxyUri.Host -and !$proxyUri.UserInfo) {
            $env:GRADLE_OPTS = "$env:GRADLE_OPTS -Dhttp.proxyHost=$($proxyUri.Host) -Dhttp.proxyPort=$($proxyUri.Port) -Dhttps.proxyHost=$($proxyUri.Host) -Dhttps.proxyPort=$($proxyUri.Port)"
        }
    }
    if (!$SkipWebBuild) { & npm.cmd run build; if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' } }
    if (!(Test-Path 'dist/index.html')) { throw 'Missing real dist/index.html. Build web app first.' }
    & node node_modules/@capacitor/cli/bin/capacitor sync android
    if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed.' }
    $sdkProperty = $env:ANDROID_HOME.Replace('\','/')
    "sdk.dir=$sdkProperty" | Set-Content android/local.properties -Encoding ascii
    Push-Location android
    try { & .\gradlew.bat --no-daemon assembleDebug; if ($LASTEXITCODE -ne 0) { throw 'Gradle build failed.' } } finally { Pop-Location }
    New-Item -ItemType Directory -Force release | Out-Null
    Copy-Item android/app/build/outputs/apk/debug/app-debug.apk release/kirameku-0.01-debug.apk -Force
    & "$env:ANDROID_HOME/build-tools/36.0.0/apksigner.bat" verify --verbose release/kirameku-0.01-debug.apk
    if ($LASTEXITCODE -ne 0) { throw 'APK signature validation failed.' }
    (Get-FileHash release/kirameku-0.01-debug.apk -Algorithm SHA256).Hash | Set-Content release/kirameku-0.01-debug.apk.sha256
    Write-Host 'APK: release/kirameku-0.01-debug.apk'
} finally {
    foreach ($name in $previousEnv.Keys) { [Environment]::SetEnvironmentVariable($name,$previousEnv[$name],'Process') }
    Pop-Location
}

