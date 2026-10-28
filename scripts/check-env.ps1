# check-env.ps1 – Reports only "set" or "missing" for each required variable.
# Never prints values.

$required = @(
    # Core
    'PORT', 'CLIENT_ORIGIN', 'DATABASE_URL', 'JWT_SECRET',
    'COLLEGE_EMAIL_DOMAIN', 'NLP_URL', 'UPLOAD_DIR', 'MAX_IMAGE_MB',
    # Cloudinary
    'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
    # Resend
    'RESEND_API_KEY', 'EMAIL_FROM',
    # Google OAuth
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
    # Cloudflare Turnstile
    'TURNSTILE_SECRET_KEY',
    # Gemini
    'GEMINI_API_KEY'
)

# Load server/.env if it exists
$envFile = Join-Path $PSScriptRoot '..\server\.env'
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([A-Z_]+)=(.+)$') {
            [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
        }
    }
}

Write-Host "`n=== Server environment variable status ===`n"
foreach ($name in $required) {
    $val = [System.Environment]::GetEnvironmentVariable($name, 'Process')
    if ($null -ne $val -and $val -ne '') {
        Write-Host "  $name : set" -ForegroundColor Green
    } else {
        Write-Host "  $name : missing" -ForegroundColor Yellow
    }
}

$clientRequired = @('VITE_API_URL', 'VITE_SOCKET_URL', 'VITE_GOOGLE_CLIENT_ID', 'VITE_TURNSTILE_SITE_KEY')
$clientEnvFile = Join-Path $PSScriptRoot '..\client\.env'
Write-Host "`n=== Client environment variable status ===`n"
if (Test-Path $clientEnvFile) {
    $clientVars = @{}
    Get-Content $clientEnvFile | ForEach-Object {
        if ($_ -match '^(VITE_[A-Z_]+)=(.*)$') {
            $clientVars[$Matches[1]] = $Matches[2]
        }
    }
    foreach ($name in $clientRequired) {
        if ($clientVars.ContainsKey($name) -and $clientVars[$name] -ne '') {
            Write-Host "  $name : set" -ForegroundColor Green
        } else {
            Write-Host "  $name : missing" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  client/.env not found" -ForegroundColor Red
}
Write-Host ""
