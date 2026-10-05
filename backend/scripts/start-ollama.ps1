$ollamaPath = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollamaPath) {
  Write-Host 'Ollama is not installed or not available in PATH.'
  exit 1
}

$running = Get-Process ollama -ErrorAction SilentlyContinue
if (-not $running) {
  Write-Host 'Starting Ollama...'
  Start-Process ollama -ArgumentList 'serve' -WindowStyle Hidden
  Start-Sleep -Seconds 5
}

$baseUrl = 'http://localhost:11434/api/tags'
try {
  $response = Invoke-WebRequest -Uri $baseUrl -UseBasicParsing -TimeoutSec 10
  if ($response.StatusCode -eq 200) {
    Write-Host 'Ollama is ready.'
  }
} catch {
  Write-Host "Ollama did not respond at $baseUrl."
  Write-Host $_.Exception.Message
}
