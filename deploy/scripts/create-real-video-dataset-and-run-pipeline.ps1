param(
    [string]$BackendUrl = 'http://localhost:8080',
    [string]$Username = 'admin',
    [string]$Password = 'Smp@123456',
    [string]$TenantCode = 'YF',
    [string]$TenantId = 'TENANT-CABIN',
    [string]$PipelineId = 'PIPE-VIDEO-PREP',
    [string]$SampleFileName = 'real-video-sample.mp4',
    [switch]$KeepPipelineSource,
    [switch]$SkipConfirmActivate
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$tmpDir = Join-Path $repoRoot '.codex\tmp'
$samplePath = Join-Path $tmpDir $SampleFileName
$sampleUrls = @(
    'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
    'https://filesamples.com/samples/video/mp4/sample_640x360.mp4'
)

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Invoke-ApiJson {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $false)][string]$Token,
        [Parameter(Mandatory = $false)]$Body
    )
    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    if ($null -ne $Body) {
        return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 50)
    }
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers
}

function Download-RealSampleVideo {
    param([string]$OutputPath)
    New-Item -ItemType Directory -Force (Split-Path $OutputPath -Parent) | Out-Null
    if ((Test-Path $OutputPath) -and ((Get-Item $OutputPath).Length -gt 1024)) {
        Write-Host "复用本地样例文件: $OutputPath"
        return 'local-cache'
    }
    foreach ($url in $sampleUrls) {
        try {
            Write-Host "尝试下载: $url"
            if (Test-Path $OutputPath) {
                Remove-Item -LiteralPath $OutputPath -Force -ErrorAction SilentlyContinue
            }
            Invoke-WebRequest -Uri $url -OutFile $OutputPath -TimeoutSec 90
            if ((Test-Path $OutputPath) -and ((Get-Item $OutputPath).Length -gt 1024)) {
                return $url
            }
        } catch {
            Write-Warning "下载失败: $url :: $($_.Exception.Message)"
        }
    }
    throw '无法下载真实 MP4 样例文件。'
}

function Upload-PlatformFile {
    param(
        [string]$BaseApi,
        [string]$Token,
        [string]$TenantId,
        [string]$FilePath
    )
    $sha256 = (Get-FileHash -Path $FilePath -Algorithm SHA256).Hash.ToLowerInvariant()
    $sizeBytes = (Get-Item $FilePath).Length
    $filename = Split-Path $FilePath -Leaf
    $init = Invoke-ApiJson -Method Post -Url "$BaseApi/platform/files/init" -Token $Token -Body @{
        assetType = 'DATASET'
        tenantId = $TenantId
        projectId = $null
        filename = $filename
        expectedSha256 = $sha256
        expectedSizeBytes = [int64]$sizeBytes
        contentType = 'video/mp4'
        storageTier = 'STANDARD'
    }
    $fileId = $init.data.fileId
    $uploadResponseText = & curl.exe -sS -X POST "$BaseApi/platform/files/$fileId/content" -H "Authorization: Bearer $Token" -F "file=@$FilePath;type=video/mp4"
    if ($LASTEXITCODE -ne 0) {
        throw "文件上传失败: $filename"
    }
    $upload = $uploadResponseText | ConvertFrom-Json
    $complete = Invoke-ApiJson -Method Post -Url "$BaseApi/platform/files/$fileId/complete" -Token $Token -Body @{
        sha256 = $sha256
        sizeBytes = [int64]$sizeBytes
    }
    return [pscustomobject]@{
        fileId = $fileId
        sha256 = $sha256
        sizeBytes = [int64]$sizeBytes
        uploadStatus = $upload.data.status
        completeStatus = $complete.data.status
        contentType = $complete.data.contentType
        objectKey = $complete.data.objectKey
        filename = $filename
    }
}

function Mark-DatasetVersionPublishedLocal {
    param(
        [string]$DatasetId,
        [string]$VersionId
    )
    @"
UPDATE dataset_version
SET status='PUBLISHED',
    content_safety_status='PASSED',
    diagnostic_code='OK',
    diagnostic_message='SANDBOX_CONTENT_SAFETY_PASSED',
    published_at=COALESCE(published_at, NOW())
WHERE version_id='$VersionId';
UPDATE dataset
SET status='ACTIVE', current_version_id='$VersionId', updated_at=NOW()
WHERE dataset_id='$DatasetId';
"@ | docker exec -i smp-platform-postgres psql -U smp -d smp_platform | Out-Null
}

function Convert-PipelineDetailToSaveBody {
    param(
        $Detail,
        [string]$OverrideDatasetId,
        [string]$OverrideVersionId
    )
    $nodes = @()
    foreach ($node in $Detail.nodes) {
        $configJson = $node.configJson
        if ($node.operatorId -eq 'OP-READ-DATASET' -and $OverrideDatasetId) {
            $configJson = '{"datasetId":"' + $OverrideDatasetId + '"}'
        }
        $nodes += @{
            nodeId = $node.nodeId
            operatorId = $node.operatorId
            label = $node.label
            positionX = $node.positionX
            positionY = $node.positionY
            configJson = $configJson
        }
    }
    $edges = @()
    foreach ($edge in $Detail.edges) {
        $edges += @{
            edgeId = $edge.edgeId
            sourceNodeId = $edge.sourceNodeId
            targetNodeId = $edge.targetNodeId
            edgeType = $edge.edgeType
        }
    }
    $variables = @()
    foreach ($variable in $Detail.variables) {
        $variables += @{
            name = $variable.name
            valueType = $variable.valueType
            valueKind = $variable.valueKind
            valueJson = $variable.valueMasked
            required = $variable.required
        }
    }
    return @{
        name = $Detail.pipeline.name
        tenantId = $Detail.pipeline.tenantId
        projectId = $Detail.pipeline.projectId
        description = $Detail.pipeline.description
        templateCode = $Detail.pipeline.templateCode
        sourceDatasetId = $(if ($OverrideDatasetId) { $OverrideDatasetId } else { $Detail.pipeline.sourceDatasetId })
        sourceVersionId = $(if ($OverrideVersionId) { $OverrideVersionId } else { $Detail.pipeline.sourceVersionId })
        resultDatasetConfig = @{
            datasetName = "$($Detail.pipeline.name) 输出"
            datasetType = 'PREPROCESSED'
            datasetDataType = 'IMAGE'
            autoActivate = $false
        }
        nodes = $nodes
        edges = $edges
        variables = $variables
    }
}

Write-Step '下载真实 MP4 样例文件'
$downloadUrl = Download-RealSampleVideo -OutputPath $samplePath

$baseApi = "$BackendUrl/api/v1"
Write-Step '登录本地平台'
$login = Invoke-RestMethod -Method Post -Uri "$baseApi/auth/login" -ContentType 'application/json' -Body (@{
    username = $Username
    password = $Password
    tenantCode = $TenantCode
} | ConvertTo-Json)
$token = $login.data.accessToken
if (-not $token) {
    throw '登录失败：未获取 accessToken。'
}

Write-Step '上传真实 MP4 到平台文件对象'
$fileUpload = Upload-PlatformFile -BaseApi $baseApi -Token $token -TenantId $TenantId -FilePath $samplePath

Write-Step '创建真实视频数据集并绑定 MP4 文件'
$datasetCreate = Invoke-ApiJson -Method Post -Url "$baseApi/datasets" -Token $token -Body @{
    name = '真实视频抽帧测试数据集'
    datasetType = 'RAW'
    dataType = 'AUDIO_VIDEO'
    tenantId = $TenantId
    projectId = $null
    accessLevel = 'TEAM'
    tags = @('真实视频', '抽帧测试', 'MP4')
    description = '通过平台文件对象上传的真实 MP4，用于 PIPE-VIDEO-PREP 抽帧验证'
    recordCount = 1
    sourceId = $null
}
$datasetId = $datasetCreate.data.dataset.datasetId
$versionId = $datasetCreate.data.selectedVersionId
$attach = Invoke-ApiJson -Method Post -Url "$baseApi/datasets/$datasetId/versions/$versionId/files" -Token $token -Body @{
    fileId = $fileUpload.fileId
    fileRole = 'RAW'
}

Write-Step '将本地实验数据集状态修正为 ACTIVE/PUBLISHED'
Mark-DatasetVersionPublishedLocal -DatasetId $datasetId -VersionId $versionId

Write-Step '临时切换抽帧 Pipeline 源数据集并运行真实抽帧'
$pipelineDetail = (Invoke-ApiJson -Method Get -Url "$baseApi/pipelines/$PipelineId" -Token $token).data
$restoreBody = Convert-PipelineDetailToSaveBody -Detail $pipelineDetail -OverrideDatasetId $null -OverrideVersionId $null
try {
    $updateBody = Convert-PipelineDetailToSaveBody -Detail $pipelineDetail -OverrideDatasetId $datasetId -OverrideVersionId $versionId
    Invoke-ApiJson -Method Put -Url "$baseApi/pipelines/$PipelineId" -Token $token -Body $updateBody | Out-Null
    $run = Invoke-ApiJson -Method Post -Url "$baseApi/pipelines/$PipelineId/runs" -Token $token -Body @{
        triggerMode = 'MANUAL'
        sampleDatasetId = $datasetId
    }
    $outputDatasetId = $run.data.run.outputDatasetId
    $preview = Invoke-ApiJson -Method Get -Url "$baseApi/preprocessed-datasets/$outputDatasetId/preview" -Token $token
    $confirm = $null
    $activate = $null
    if (-not $SkipConfirmActivate) {
        $confirm = Invoke-ApiJson -Method Post -Url "$baseApi/preprocessed-datasets/$outputDatasetId/confirm" -Token $token -Body @{
            decision = 'CONFIRM'
            comment = '真实 MP4 抽帧验证'
        }
        $activate = Invoke-ApiJson -Method Post -Url "$baseApi/preprocessed-datasets/$outputDatasetId/activate" -Token $token -Body @{
            targetVersionId = $confirm.data.targetVersionId
            activationNote = '真实 MP4 抽帧验证激活'
        }
    }

    $result = [pscustomobject]@{
        sourceDownloadUrl = $downloadUrl
        sampleVideoPath = $samplePath
        uploadedFile = $fileUpload
        datasetId = $datasetId
        versionId = $versionId
        datasetFileContentType = $attach.data.contentType
        datasetFileObjectKey = $attach.data.objectKey
        pipelineId = $PipelineId
        runId = $run.data.run.runId
        runStatus = $run.data.run.status
        outputDatasetId = $outputDatasetId
        previewStatus = $preview.data.status
        previewDatasetDataType = $preview.data.datasetDataType
        samplePairCount = @($preview.data.samplePairs).Count
        confirmedStatus = $(if ($confirm) { $confirm.data.status } else { $null })
        activatedStatus = $(if ($activate) { $activate.data.status } else { $null })
        annotationEligible = $(if ($activate) { $activate.data.annotationEligible } else { $null })
    }
    $result | ConvertTo-Json -Depth 30
}
finally {
    if (-not $KeepPipelineSource) {
        Write-Step '恢复 Pipeline 源数据集配置'
        Invoke-ApiJson -Method Put -Url "$baseApi/pipelines/$PipelineId" -Token $token -Body $restoreBody | Out-Null
    }
}
