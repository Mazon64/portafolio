Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ConvertTo-PrismaConnectionString {
  param(
    [Parameter(Mandatory)]
    [string]$ConnectionString,

    [Parameter(Mandatory)]
    [string]$EncodedPassword,

    [Parameter(Mandatory)]
    [int]$ExpectedPort
  )

  $value = $ConnectionString.Trim().Trim('"')
  $value = $value -replace '^(postgres(?:ql)?://)postgres\.', '${1}prisma.'
  $match = [regex]::Match($value, '^(postgres(?:ql)?://[^:]+:)([^@]*)(@.+)$')

  if (-not $match.Success) {
    throw "The connection string does not have the expected PostgreSQL format."
  }

  $value = $match.Groups[1].Value + $EncodedPassword + $match.Groups[3].Value

  if ($value -notmatch ":$ExpectedPort/") {
    throw "The connection string must use port $ExpectedPort."
  }

  return $value
}

function Set-EnvironmentValue {
  param(
    [Parameter(Mandatory)]
    [string]$FilePath,

    [Parameter(Mandatory)]
    [string]$Name,

    [Parameter(Mandatory)]
    [string]$Value
  )

  if (-not (Test-Path -LiteralPath $FilePath)) {
    throw "Missing environment file: $FilePath"
  }

  $lines = [System.Collections.Generic.List[string]]::new()
  $lines.AddRange([string[]](Get-Content -LiteralPath $FilePath))
  $replacement = "$Name=`"$Value`""
  $index = -1

  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^$Name=") {
      $index = $i
      break
    }
  }

  if ($index -ge 0) {
    $lines[$index] = $replacement
  } else {
    if ($lines.Count -gt 0 -and $lines[$lines.Count - 1] -ne "") {
      $lines.Add("")
    }
    $lines.Add($replacement)
  }

  $utf8WithoutBom = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllLines($FilePath, $lines, $utf8WithoutBom)
}

$transactionUrl = Read-Host "Paste the Transaction pooler URL (port 6543)"
$sessionUrl = Read-Host "Paste the Session pooler URL (port 5432)"
$securePassword = Read-Host "Enter the prisma database password" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)

  if ([string]::IsNullOrWhiteSpace($password)) {
    throw "The prisma password cannot be empty."
  }

  $encodedPassword = [Uri]::EscapeDataString($password)
  $databaseUrl = ConvertTo-PrismaConnectionString $transactionUrl $encodedPassword 6543
  $directUrl = ConvertTo-PrismaConnectionString $sessionUrl $encodedPassword 5432
  $root = Split-Path -Parent $PSScriptRoot

  foreach ($fileName in @(".env", ".env.docker")) {
    $filePath = Join-Path $root $fileName
    Set-EnvironmentValue $filePath "DATABASE_URL" $databaseUrl
    Set-EnvironmentValue $filePath "DIRECT_URL" $directUrl
  }

  "Supabase connections configured in .env and .env.docker."
} finally {
  if ($passwordPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  }

  $password = $null
  $encodedPassword = $null
  $databaseUrl = $null
  $directUrl = $null
}
