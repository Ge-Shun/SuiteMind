param(
  [string]$OutputDirectory = "artifacts/connector",
  [switch]$SkipArchive
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$localDotnet = Join-Path $repositoryRoot ".tools/dotnet/dotnet.exe"
$dotnet = if (Test-Path $localDotnet) { $localDotnet } else { "dotnet" }
$project = Join-Path $repositoryRoot "apps/desktop-connector/SuiteMind.Connector.csproj"
$publishDirectory = Join-Path $repositoryRoot "$OutputDirectory/publish"

Remove-Item -LiteralPath $publishDirectory -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $publishDirectory -Force | Out-Null

& $dotnet publish $project `
  --configuration Release `
  --runtime win-x64 `
  --self-contained true `
  --output $publishDirectory

if ($LASTEXITCODE -ne 0) {
  throw "Connector publish failed with exit code $LASTEXITCODE."
}

$executablePath = Join-Path $publishDirectory "SuiteMindConnector.exe"
if (-not (Test-Path $executablePath)) {
  throw "Published connector executable was not found."
}

if ($SkipArchive) {
  Write-Output "Published $executablePath"
  exit 0
}

& (Join-Path $PSScriptRoot "package-connector.ps1") `
  -ExecutablePath $executablePath `
  -ArchivePath (Join-Path $repositoryRoot "$OutputDirectory/SuiteMind-Connector-win-x64.zip")
