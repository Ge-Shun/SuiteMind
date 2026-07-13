param(
  [string]$ExecutablePath = "artifacts/connector/publish/SuiteMindConnector.exe",
  [string]$ArchivePath = "artifacts/connector/SuiteMind-Connector-win-x64.zip",
  [switch]$RequireSignature
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot

function Resolve-RepositoryPath([string]$Path) {
  if ([System.IO.Path]::IsPathRooted($Path)) {
    return $Path
  }

  return Join-Path $repositoryRoot $Path
}

$resolvedExecutablePath = Resolve-RepositoryPath $ExecutablePath
$resolvedArchivePath = Resolve-RepositoryPath $ArchivePath

if (-not (Test-Path -LiteralPath $resolvedExecutablePath -PathType Leaf)) {
  throw "Connector executable was not found at $resolvedExecutablePath."
}

$signature = Get-AuthenticodeSignature -LiteralPath $resolvedExecutablePath
if ($RequireSignature) {
  if ($signature.Status -ne [System.Management.Automation.SignatureStatus]::Valid) {
    throw "Connector Authenticode signature is not valid. Status: $($signature.Status). $($signature.StatusMessage)"
  }

  if ($signature.SignatureType -ne [System.Management.Automation.SignatureType]::Authenticode) {
    throw "Connector executable does not contain an Authenticode signature."
  }

  if ($null -eq $signature.SignerCertificate) {
    throw "Connector signature does not contain a signer certificate."
  }

  if ($null -eq $signature.TimeStamperCertificate) {
    throw "Connector signature does not contain a trusted timestamp."
  }

  Write-Output "Verified Authenticode signer: $($signature.SignerCertificate.Subject)"
  Write-Output "Verified timestamp authority: $($signature.TimeStamperCertificate.Subject)"
} elseif ($signature.Status -eq [System.Management.Automation.SignatureStatus]::NotSigned) {
  Write-Warning "Packaging an unsigned connector. Production releases should enable SignPath signing."
} elseif ($signature.Status -ne [System.Management.Automation.SignatureStatus]::Valid) {
  throw "Connector contains an invalid signature. Status: $($signature.Status). $($signature.StatusMessage)"
}

$archiveDirectory = Split-Path -Parent $resolvedArchivePath
New-Item -ItemType Directory -Path $archiveDirectory -Force | Out-Null
Remove-Item -LiteralPath $resolvedArchivePath -Force -ErrorAction SilentlyContinue
Compress-Archive -LiteralPath $resolvedExecutablePath -DestinationPath $resolvedArchivePath
Write-Output "Created $resolvedArchivePath"
