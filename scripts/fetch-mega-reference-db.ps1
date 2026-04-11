Param(
  [string]$OutputDir = "data/reference-games/mega",
  [string]$OutputFile = "mega-famous-2600plus.pgn"
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$destDir = Join-Path $root $OutputDir
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

$players = @(
  "Carlsen","Kasparov","Karpov","Anand","Kramnik","Topalov","Aronian","Nakamura","So","Giri",
  "Nepomniachtchi","Ding","Firouzja","Karjakin","Svidler","Mamedyarov","Grischuk","Radjabov",
  "VachierLagrave","Dominguez","Caruana","Polgar","Ivanchuk","Shirov","Ponomariov","Adams",
  "Leko","Bacrot","Naiditsch","Navara","Wojtaszek","Duda","Gelfand","Shabalov","Short",
  "Fischer","Spassky","Tal","Petrosian","Smyslov","Botvinnik","Alekhine","Capablanca","Korchnoi",
  "Larsen","Timman","Portisch","Keres","Bronstein","Reshevsky"
)

$downloaded = 0
$failed = @()
$parts = @()

foreach ($name in $players) {
  $url = "https://www.pgnmentor.com/players/$name.pgn"
  $outPath = Join-Path $destDir "$name.pgn"
  try {
    Write-Host "Downloading $url"
    Invoke-WebRequest -Uri $url -OutFile $outPath
    if ((Get-Item $outPath).Length -lt 200) {
      throw "Downloaded file seems empty."
    }
    $downloaded += 1
    $parts += $outPath
  } catch {
    Write-Host "Failed: $name"
    $failed += $name
  }
}

$megaOut = Join-Path $destDir $OutputFile
if (Test-Path $megaOut) {
  Remove-Item $megaOut -Force
}

foreach ($part in $parts) {
  Add-Content -Path $megaOut -Value "`n"
  Get-Content $part -Raw | Add-Content -Path $megaOut
}

$summary = @"
Downloaded files: $downloaded
Failed files: $($failed.Count)
Output PGN: $megaOut
Generated at: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

$summaryPath = Join-Path $destDir "mega-download-summary.txt"
Set-Content -Path $summaryPath -Value $summary
if ($failed.Count -gt 0) {
  Add-Content -Path $summaryPath -Value "`nFailed names:"
  $failed | ForEach-Object { Add-Content -Path $summaryPath -Value $_ }
}

Write-Host $summary
Write-Host "Summary file: $summaryPath"
