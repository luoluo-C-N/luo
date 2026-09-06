param(
    [string]$BackendSource = "$env:USERPROFILE/.zcode/workspace/default/Kirameku/Kirameku-backend",
    [switch]$Device,
    [string]$DeviceHost = '192.168.10.83'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$env:KIRAMEKU_BACKEND_SOURCE = $BackendSource
if ($Device) {
    $env:TEST_BACKEND_HOST = '0.0.0.0'
    $env:TEST_DEVICE_BASE_URL = "http://${DeviceHost}:8011"
}
$pythonExe = Join-Path $BackendSource '.venv/Scripts/python.exe'
if (!(Test-Path -LiteralPath $pythonExe)) { throw "Backend Python runtime missing: $pythonExe" }
& $pythonExe (Join-Path $PSScriptRoot 'test-backend.py')
