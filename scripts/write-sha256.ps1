param(
  [Parameter(Mandatory = $true)]
  [string]$Path,
  [string]$OutputPath
)

$ErrorActionPreference = "Stop"
$resolvedPath = (Resolve-Path -LiteralPath $Path).Path
$fileName = Split-Path -Leaf $resolvedPath

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = "$resolvedPath.sha256"
} elseif (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath = Join-Path (Get-Location) $OutputPath
}

$outputDirectory = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$hash = (Get-FileHash -LiteralPath $resolvedPath -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath $OutputPath -Value "$hash  $fileName" -Encoding Ascii
Write-Output "Created $OutputPath"
