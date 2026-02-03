# 01-check-prereqs.ps1
$ErrorActionPreference = "SilentlyContinue"

function Ok($m){ Write-Host "✅ $m" }
function Fail($m){ Write-Host "❌ $m" }
function Has($c){ return [bool](Get-Command $c -ErrorAction SilentlyContinue) }

Write-Host "=== Checking prerequisites ==="

$tools = @("git","node","npm","docker","kubectl","helm","kind")
$missing = @()

foreach ($t in $tools) {
  if (Has $t) {
    try {
      $v = switch ($t) {
        "git" { git --version }
        "node" { node -v }
        "npm" { "npm " + (npm -v) }
        "docker" { docker --version }
        "kubectl" { kubectl version --client --short }
        "helm" { helm version --short }
        "kind" { kind version }
        default { "$t present" }
      }
      Ok "$t => $v"
    } catch {
      Ok "$t => installed"
    }
  } else {
    Fail "$t is missing"
    $missing += $t
  }
}

Write-Host ""
if (Has "docker") {
  try { docker info *> $null; Ok "Docker daemon reachable" }
  catch { Fail "Docker installed but NOT running. Start Docker Desktop." }
}

if ($missing.Count -gt 0) {
  Write-Host ""
  Fail ("Missing tools: " + ($missing -join ", "))
  exit 1
}

Ok "All required tools found."
exit 0
