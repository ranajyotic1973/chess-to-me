Param(
  [string]$StockfishExePath = "",
  [switch]$DownloadOllama,
  [switch]$IncludeQwen3FromLocalOllama
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$vendorRoot = Join-Path $root "vendor"
$ollamaDir = Join-Path $vendorRoot "ollama"
$stockfishDir = Join-Path $vendorRoot "stockfish"
$modelsDir = Join-Path $vendorRoot "models\qwen3"

New-Item -ItemType Directory -Force -Path $ollamaDir | Out-Null
New-Item -ItemType Directory -Force -Path $stockfishDir | Out-Null

if ($DownloadOllama) {
  $ollamaUrl = "https://ollama.com/download/OllamaSetup.exe"
  $ollamaOut = Join-Path $ollamaDir "OllamaSetup.exe"
  Write-Host "Downloading Ollama installer from $ollamaUrl"
  Invoke-WebRequest -Uri $ollamaUrl -OutFile $ollamaOut
  Write-Host "Saved: $ollamaOut"
}

if ($StockfishExePath -and (Test-Path $StockfishExePath)) {
  $dest = Join-Path $stockfishDir "stockfish.exe"
  Copy-Item -Force $StockfishExePath $dest
  Write-Host "Copied Stockfish: $dest"
} else {
  Write-Host "Stockfish path not supplied or missing. Skipping Stockfish copy."
}

if ($IncludeQwen3FromLocalOllama) {
  $localOllamaModels = Join-Path $env:USERPROFILE ".ollama\models"
  if (Test-Path $localOllamaModels) {
    New-Item -ItemType Directory -Force -Path $modelsDir | Out-Null
    Copy-Item -Recurse -Force (Join-Path $localOllamaModels "*") $modelsDir
    Write-Host "Copied local Ollama models into: $modelsDir"
    Write-Host "Note: This can be very large if multiple models are present."
  } else {
    Write-Host "No local Ollama models directory found at $localOllamaModels"
  }
}

Write-Host "Installer assets prepared under: $vendorRoot"
