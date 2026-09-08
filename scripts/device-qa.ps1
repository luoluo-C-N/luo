param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('info','install','reset','launch','screenshot','ui','logs','perf')]
    [string]$Action,
    [string]$Serial = '',
    [string]$Name = 'capture'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$adb = Join-Path $projectRoot 'tools/android-sdk/platform-tools/adb.exe'
$package = 'cn.kirameku.pocket'
$activity = "$package/.MainActivity"
$artifactRoot = Join-Path $projectRoot 'artifacts/device-qa'
$apk = Join-Path $projectRoot 'release/掌上小站-v0.01-debug.apk'

if (!(Test-Path -LiteralPath $adb)) { throw "ADB not found: $adb" }
New-Item -ItemType Directory -Force -Path $artifactRoot | Out-Null
& $adb start-server | Out-Null

if (!$Serial) {
    $devices = @(& $adb devices | Select-Object -Skip 1 | ForEach-Object {
        if ($_ -match '^(\S+)\s+device$') { $matches[1] }
    })
    if ($devices.Count -ne 1) { throw "Expected exactly one authorized Android device; found $($devices.Count)." }
    $Serial = $devices[0]
}

function Invoke-Adb {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    & $adb -s $Serial @Arguments
    if ($LASTEXITCODE -ne 0) { throw "ADB failed: $($Arguments -join ' ')" }
}

switch ($Action) {
    'info' {
        $lines = @(
            "serial=$Serial"
            "manufacturer=$(Invoke-Adb shell getprop ro.product.manufacturer)"
            "model=$(Invoke-Adb shell getprop ro.product.model)"
            "android=$(Invoke-Adb shell getprop ro.build.version.release)"
            "sdk=$(Invoke-Adb shell getprop ro.build.version.sdk)"
            "abi=$(Invoke-Adb shell getprop ro.product.cpu.abi)"
            "size=$(Invoke-Adb shell wm size)"
            "density=$(Invoke-Adb shell wm density)"
            "battery=$(Invoke-Adb shell dumpsys battery | Select-String 'level:' | ForEach-Object { $_.Line.Trim() })"
            "storage=$(Invoke-Adb shell df -h /data | Select-Object -Last 1)"
        )
        $lines | Set-Content -LiteralPath (Join-Path $artifactRoot 'device-info.txt') -Encoding utf8
        $lines
    }
    'install' {
        if (!(Test-Path -LiteralPath $apk)) { throw "APK not found: $apk" }
        $output = Invoke-Adb -Arguments @('install','-r','-t',$apk)
        $output | Set-Content -LiteralPath (Join-Path $artifactRoot 'install.txt') -Encoding utf8
        $path = Invoke-Adb shell pm path $package
        if (!$path) { throw "Package $package was not installed." }
        $output
        $path
    }
    'reset' {
        Invoke-Adb shell am force-stop $package | Out-Null
        $result = Invoke-Adb shell pm clear $package
        if (($result -join '') -notmatch 'Success') { throw "Could not clear $package data." }
        Invoke-Adb logcat -c | Out-Null
        $result
    }
    'launch' {
        Invoke-Adb -Arguments @('shell','am','start','-W','-n',$activity)
    }
    'screenshot' {
        $remote = '/data/local/tmp/kirameku-device-qa.png'
        $local = Join-Path $artifactRoot ($Name + '.png')
        Invoke-Adb -Arguments @('shell','screencap','-p',$remote) | Out-Null
        Invoke-Adb pull $remote $local | Out-Null
        Invoke-Adb shell rm $remote | Out-Null
        $local
    }
    'ui' {
        $remote = '/data/local/tmp/kirameku-device-qa.xml'
        $local = Join-Path $artifactRoot ($Name + '.xml')
        Invoke-Adb shell uiautomator dump $remote | Out-Null
        Invoke-Adb pull $remote $local | Out-Null
        Invoke-Adb shell rm $remote | Out-Null
        $local
    }
    'logs' {
        $appPid = [string](& $adb -s $Serial shell pidof $package | Select-Object -First 1)
        $appPid = $appPid.Trim()
        $local = Join-Path $artifactRoot ($Name + '-logcat.txt')
        if ($appPid) { Invoke-Adb -Arguments @('logcat',"--pid=$appPid",'-d','-v','time') | Set-Content -LiteralPath $local -Encoding utf8 }
        else { "Package process is not running." | Set-Content -LiteralPath $local -Encoding utf8 }
        $local
    }
    'perf' {
        $gfx = Join-Path $artifactRoot ($Name + '-gfxinfo.txt')
        $mem = Join-Path $artifactRoot ($Name + '-meminfo.txt')
        Invoke-Adb shell dumpsys gfxinfo $package | Set-Content -LiteralPath $gfx -Encoding utf8
        Invoke-Adb shell dumpsys meminfo $package | Set-Content -LiteralPath $mem -Encoding utf8
        $gfx
        $mem
    }
}
