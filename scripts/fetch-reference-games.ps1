Param(
  [string]$OutputDir = "data/reference-games/downloaded"
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$dest = Join-Path $root $OutputDir
New-Item -ItemType Directory -Force -Path $dest | Out-Null

# Free PGN files from PGN Mentor.
$sources = @(
  @{ Name = "Carlsen.pgn"; Url = "https://www.pgnmentor.com/players/Carlsen.pgn" },
  @{ Name = "Fischer.pgn"; Url = "https://www.pgnmentor.com/players/Fischer.pgn" },
  @{ Name = "Kasparov.pgn"; Url = "https://www.pgnmentor.com/players/Kasparov.pgn" },
  @{ Name = "Capablanca.pgn"; Url = "https://www.pgnmentor.com/players/Capablanca.pgn" }
)

foreach ($src in $sources) {
  $outFile = Join-Path $dest $src.Name
  Write-Host "Downloading $($src.Url)"
  Invoke-WebRequest -Uri $src.Url -OutFile $outFile
  Write-Host "Saved $outFile"
}

Write-Host "Reference games downloaded to $dest"
