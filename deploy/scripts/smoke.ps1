param(
  [string]$BackendUrl = "http://localhost:8080",
  [string]$FrontendUrl = "http://localhost:5173"
)

$ErrorActionPreference = "Stop"
Invoke-RestMethod "$BackendUrl/actuator/health" | Out-Null
Invoke-WebRequest -UseBasicParsing $FrontendUrl | Out-Null
Write-Host "SMP smoke check passed."
