param(
    [string]$JavaHome,
    [switch]$WithKafka,
    [switch]$WithLabelStudio,
    [switch]$WithFrontend,
    [switch]$FrontendOnly,
    [switch]$DepsOnly,
    [int]$BackendPort = 8080,
    [int]$FrontendPort = 5173,
    [string]$LabelStudioToken = 'smp-local-label-studio-token'
)

$ErrorActionPreference = 'Stop'

$SkillRoot = Split-Path -Parent $PSScriptRoot
$RepoRoot = Resolve-Path (Join-Path $SkillRoot '..\..\..')
$PrepareScript = Join-Path $RepoRoot 'deploy\scripts\prepare-data-source-lab.ps1'
$ComposeFile = Join-Path $RepoRoot 'deploy\local\docker-compose.yml'
$RuntimeDir = Join-Path $RepoRoot '.codex\tasks\tmp\start-services'
$BackendOutLog = Join-Path $RuntimeDir "backend-$BackendPort.out.log"
$BackendErrLog = Join-Path $RuntimeDir "backend-$BackendPort.err.log"
$BackendHealthUrl = "http://localhost:$BackendPort/actuator/health"
$FrontendRuntimeDir = Join-Path $RepoRoot '.codex\tasks\tmp\frontend-dev'
$FrontendOutLog = Join-Path $FrontendRuntimeDir "frontend-$FrontendPort.out.log"
$FrontendErrLog = Join-Path $FrontendRuntimeDir "frontend-$FrontendPort.err.log"
$FrontendUrl = "http://localhost:$FrontendPort"

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Ensure-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "缺少命令：$Name"
    }
}

function Assert-DockerDaemon {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $null = & docker info 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw 'Docker daemon 不可用。请先启动 Docker Desktop 或本机 Docker 服务。'
        }
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

function Resolve-JavaHome {
    if ($JavaHome) {
        return (Resolve-Path $JavaHome).Path
    }
    if ($env:JAVA_HOME -and (Test-Path $env:JAVA_HOME)) {
        return (Resolve-Path $env:JAVA_HOME).Path
    }
    $defaultJava = 'C:\java\jdk-21.0.6'
    if (Test-Path $defaultJava) {
        return (Resolve-Path $defaultJava).Path
    }
    $javaCommand = Get-Command java -ErrorAction SilentlyContinue
    if (-not $javaCommand) {
        throw '未找到 Java 21。请传入 -JavaHome 或设置 JAVA_HOME。'
    }
    $javaBinDir = Split-Path -Parent $javaCommand.Source
    return Split-Path -Parent $javaBinDir
}

function Assert-Java21([string]$ResolvedJavaHome) {
    $javaExe = Join-Path $ResolvedJavaHome 'bin\java.exe'
    if (-not (Test-Path $javaExe)) {
        throw "JAVA_HOME 无效：$ResolvedJavaHome"
    }
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $versionOutput = & $javaExe -version 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "java -version 执行失败，退出码：$LASTEXITCODE"
        }
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    $versionText = ($versionOutput | Out-String)
    if ($versionText -notmatch 'version "21(\.|\")' -and $versionText -notmatch ' 21(\.|\s)') {
        throw "需要 Java 21，当前版本输出：$versionText"
    }
}

function Test-HttpOk([string]$Url) {
    try {
        Invoke-RestMethod -Uri $Url -TimeoutSec 5 | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Test-WebOk([string]$Url) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
        return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400)
    } catch {
        return $false
    }
}

function Wait-HttpOk([string]$Url, [int]$TimeoutSeconds = 180) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        if (Test-HttpOk $Url) {
            return
        }
        Start-Sleep -Seconds 3
    } while ((Get-Date) -lt $deadline)
    throw "等待超时：$Url"
}

function Wait-WebOk([string]$Url, [int]$TimeoutSeconds = 180) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        if (Test-WebOk $Url) {
            return
        }
        Start-Sleep -Seconds 3
    } while ((Get-Date) -lt $deadline)
    throw "等待超时：$Url"
}

function Wait-TcpPort([string]$TargetHost, [int]$Port, [int]$TimeoutSeconds = 120) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $ok = Test-NetConnection $TargetHost -Port $Port -WarningAction SilentlyContinue
            if ($ok.TcpTestSucceeded) {
                return
            }
        } catch {}
        Start-Sleep -Seconds 3
    } while ((Get-Date) -lt $deadline)
    throw "等待 TCP 端口超时：$TargetHost`:$Port"
}

function Get-ListeningProcess([int]$Port) {
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
            Select-Object -First 1
        if ($null -eq $connection) {
            return $null
        }
        return Get-Process -Id $connection.OwningProcess -ErrorAction Stop
    } catch {
        return $null
    }
}

function Start-BackendProcess([string]$ResolvedJavaHome, [hashtable]$BackendEnv) {
    $commandParts = @()
    $commandParts += "& {"
    $commandParts += "`$env:JAVA_HOME='$($ResolvedJavaHome.Replace("'", "''"))';"
    $commandParts += "`$env:Path='$($ResolvedJavaHome.Replace("'", "''"))\bin;' + `$env:Path;"
    foreach ($entry in $BackendEnv.GetEnumerator()) {
        $safeValue = $entry.Value.Replace("'", "''")
        $commandParts += "`$env:$($entry.Key)='$safeValue';"
    }
    $commandParts += "Set-Location '$($RepoRoot.Path.Replace("'", "''"))';"
    $commandParts += "mvn -f backend/smp-app/pom.xml spring-boot:run"
    $commandParts += "}"
    $command = [string]::Join(' ', $commandParts)

    if (Test-Path $BackendOutLog) { Remove-Item $BackendOutLog -Force }
    if (Test-Path $BackendErrLog) { Remove-Item $BackendErrLog -Force }

    Start-Process -FilePath 'powershell.exe' `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $command) `
        -RedirectStandardOutput $BackendOutLog `
        -RedirectStandardError $BackendErrLog `
        -WindowStyle Hidden | Out-Null
}

function Stop-BackendPortProcess([int]$Port) {
    $process = Get-ListeningProcess -Port $Port
    if ($null -ne $process) {
        Stop-Process -Id $process.Id -Force
        Start-Sleep -Seconds 2
    }
}

function Start-FrontendProcess([int]$Port) {
    Ensure-Command npm
    Ensure-Command npx
    New-Item -ItemType Directory -Force -Path $FrontendRuntimeDir | Out-Null

    if (Test-Path $FrontendOutLog) { Remove-Item $FrontendOutLog -Force }
    if (Test-Path $FrontendErrLog) { Remove-Item $FrontendErrLog -Force }

    $frontendCommand = "Set-Location '$($RepoRoot.Path.Replace("'", "''"))\frontend'; `$env:BROWSER='none'; npx vite --host 0.0.0.0 --port $Port"
    Start-Process -FilePath 'powershell.exe' `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $frontendCommand) `
        -RedirectStandardOutput $FrontendOutLog `
        -RedirectStandardError $FrontendErrLog `
        -WindowStyle Hidden | Out-Null
}

function Invoke-FlywayRepair([hashtable]$BackendEnv) {
    Write-Step '检测到 Flyway checksum 漂移，执行本地 repair'
    $env:DB_HOST = $BackendEnv['DB_HOST']
    $env:DB_PORT = $BackendEnv['DB_PORT']
    $env:DB_NAME = $BackendEnv['DB_NAME']
    $env:DB_USER = $BackendEnv['DB_USER']
    $env:DB_PASSWORD = $BackendEnv['DB_PASSWORD']
    $env:JAVA_HOME = $resolvedJavaHome
    if ($env:Path -notlike "$resolvedJavaHome\bin*") {
        $env:Path = "$resolvedJavaHome\bin;$env:Path"
    }
    & mvn `
        '-f' 'backend/smp-app/pom.xml' `
        'flyway:repair' `
        "-Dflyway.url=jdbc:postgresql://$($BackendEnv['DB_HOST']):$($BackendEnv['DB_PORT'])/$($BackendEnv['DB_NAME'])" `
        "-Dflyway.user=$($BackendEnv['DB_USER'])" `
        "-Dflyway.password=$($BackendEnv['DB_PASSWORD'])"
    if ($LASTEXITCODE -ne 0) {
        throw 'Flyway repair 执行失败。'
    }
}

Ensure-Command docker
Ensure-Command mvn
Assert-DockerDaemon
New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

$resolvedJavaHome = Resolve-JavaHome
Assert-Java21 $resolvedJavaHome
$env:JAVA_HOME = $resolvedJavaHome
if ($env:Path -notlike "$resolvedJavaHome\bin*") {
    $env:Path = "$resolvedJavaHome\bin;$env:Path"
}

Write-Step "使用 Java 21: $resolvedJavaHome"

if ($FrontendOnly) {
    $WithFrontend = $true
}

$backendAlreadyRunning = $false

Write-Step '准备 Docker 依赖'
$prepareArgs = @(
    '-ExecutionPolicy', 'Bypass',
    '-File', $PrepareScript,
    '-SkipBackend'
)
if ($WithKafka) {
    $prepareArgs += '-WithKafka'
}
& powershell @prepareArgs

if ($WithLabelStudio) {
    Write-Step '启动 Label Studio 容器'
    & docker compose -f $ComposeFile up -d label-studio | Out-Host
}

Write-Step '确认 PostgreSQL 本机端口就绪'
Wait-TcpPort -TargetHost '127.0.0.1' -Port 5432 -TimeoutSeconds 120

if ($DepsOnly) {
    Write-Step '仅准备依赖，跳过 backend 启动'
    Write-Host "依赖已就绪。backend 未启动。"
    exit 0
}

if ($FrontendOnly) {
    Write-Step '仅启动 frontend，跳过 backend'
    if (Test-WebOk $FrontendUrl) {
        Write-Step "frontend 已运行：$FrontendUrl"
        Write-Host "stdout log: $FrontendOutLog"
        Write-Host "stderr log: $FrontendErrLog"
        exit 0
    }
    $frontendProcess = Get-ListeningProcess -Port $FrontendPort
    if ($null -ne $frontendProcess) {
        throw "端口 $FrontendPort 已被进程占用：$($frontendProcess.ProcessName) (PID $($frontendProcess.Id))，且前端健康检查未通过。"
    }
    Start-FrontendProcess -Port $FrontendPort
    Wait-WebOk -Url $FrontendUrl -TimeoutSeconds 120
    Write-Step 'frontend 启动完成'
    Write-Host "frontend url: $FrontendUrl"
    Write-Host "stdout log: $FrontendOutLog"
    Write-Host "stderr log: $FrontendErrLog"
    exit 0
}

if (Test-HttpOk $BackendHealthUrl) {
    Write-Step "backend 已运行：$BackendHealthUrl"
    Write-Host "日志目录：$RuntimeDir"
    $backendAlreadyRunning = $true
    if (-not $WithFrontend) {
        exit 0
    }
}

$backendEnv = @{
    DB_HOST = 'localhost'
    DB_PORT = '5432'
    DB_NAME = 'smp_platform'
    DB_USER = 'smp'
    DB_PASSWORD = 'smp_local_password'
    SERVER_PORT = "$BackendPort"
    SMP_STORAGE_ENDPOINT = 'http://localhost:9000'
    SMP_STORAGE_PUBLIC_ENDPOINT = 'http://localhost:9000'
    SMP_STORAGE_BUCKET = 'smp-datasets'
    SMP_STORAGE_ACCESS_KEY = 'smpminio'
    SMP_STORAGE_SECRET_KEY = 'smpminio_local_password'
    SMP_CONTENT_SAFETY_BYPASS = 'true'
}

if ($WithLabelStudio) {
    $backendEnv['SMP_LABEL_STUDIO_ENABLED'] = 'true'
    $backendEnv['SMP_LABEL_STUDIO_BASE_URL'] = 'http://localhost:8083'
    $backendEnv['SMP_LABEL_STUDIO_TOKEN_SECRET_REF'] = 'env:LABEL_STUDIO_API_TOKEN'
    $backendEnv['LABEL_STUDIO_API_TOKEN'] = $LabelStudioToken
    $backendEnv['SMP_LABEL_STUDIO_WORKSPACE_ID'] = 'local-sandbox'
    $backendEnv['SMP_LABEL_STUDIO_STORAGE_POLICY'] = 'LOCAL_FILES_READONLY'
    $backendEnv['SMP_LABEL_STUDIO_EXPORT_FORMAT'] = 'JSON'
    $backendEnv['SMP_LABEL_STUDIO_TIMEOUT_MS'] = '5000'
}

if (-not $backendAlreadyRunning) {
    $listeningProcess = Get-ListeningProcess -Port $BackendPort
    if ($null -ne $listeningProcess) {
        throw "端口 $BackendPort 已被进程占用：$($listeningProcess.ProcessName) (PID $($listeningProcess.Id))，且健康检查未通过。请先处理该进程。"
    }

    Write-Step '启动宿主机 backend'
    Push-Location $RepoRoot
    try {
        Start-BackendProcess -ResolvedJavaHome $resolvedJavaHome -BackendEnv $backendEnv
    } finally {
        Pop-Location
    }

    Write-Step '等待 backend 健康检查通过'
    try {
        Wait-HttpOk -Url $BackendHealthUrl -TimeoutSeconds 60
    } catch {
        $backendLog = if (Test-Path $BackendOutLog) { Get-Content $BackendOutLog -Raw } else { '' }
        if ($backendLog -match 'Migration checksum mismatch') {
            Stop-BackendPortProcess -Port $BackendPort
            Invoke-FlywayRepair -BackendEnv $backendEnv
            Write-Step 'repair 完成，重新启动 backend'
            Push-Location $RepoRoot
            try {
                Start-BackendProcess -ResolvedJavaHome $resolvedJavaHome -BackendEnv $backendEnv
            } finally {
                Pop-Location
            }
            Wait-HttpOk -Url $BackendHealthUrl -TimeoutSeconds 120
        } else {
            throw
        }
    }

    Write-Step '启动完成'
    Write-Host "backend health: $BackendHealthUrl"
    Write-Host "stdout log: $BackendOutLog"
    Write-Host "stderr log: $BackendErrLog"
}

if ($WithFrontend) {
    Write-Step '启动 frontend'
    if (Test-WebOk $FrontendUrl) {
        Write-Step "frontend 已运行：$FrontendUrl"
    } else {
        $frontendProcess = Get-ListeningProcess -Port $FrontendPort
        if ($null -ne $frontendProcess) {
            throw "端口 $FrontendPort 已被进程占用：$($frontendProcess.ProcessName) (PID $($frontendProcess.Id))，且前端健康检查未通过。"
        }
        Start-FrontendProcess -Port $FrontendPort
        Wait-WebOk -Url $FrontendUrl -TimeoutSeconds 120
    }
    Write-Host "frontend url: $FrontendUrl"
    Write-Host "frontend stdout log: $FrontendOutLog"
    Write-Host "frontend stderr log: $FrontendErrLog"
}
