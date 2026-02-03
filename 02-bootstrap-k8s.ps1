# 02-bootstrap-k8s.ps1
# Creates local kind cluster and installs:
# - ingress-nginx
# - kube-prometheus-stack (Prometheus + Grafana)
# - PostgreSQL (Bitnami)

$ErrorActionPreference = "Stop"

function Info($m){ Write-Host "==> $m" }
function Ok($m){ Write-Host "✅ $m" }
function Fail($m){ Write-Host "❌ $m"; exit 1 }

# 1) Ensure Docker is running
Info "Checking Docker..."
try { docker info *> $null; Ok "Docker is running" }
catch { Fail "Docker is not running. Start Docker Desktop and re-run." }

# 2) Create kind cluster (if not exists)
$cluster = "devops-assignment"
Info "Checking kind cluster '$cluster'..."
$clusters = & kind get clusters 2>$null
if ($clusters -and ($clusters -contains $cluster)) {
  Ok "kind cluster already exists: $cluster"
} else {
  Info "Creating kind cluster: $cluster"
  & kind create cluster --name $cluster | Write-Host
  Ok "kind cluster created"
}

# 3) Namespaces
Info "Creating namespaces..."
& kubectl create ns app --dry-run=client -o yaml | kubectl apply -f - | Out-Null
& kubectl create ns monitoring --dry-run=client -o yaml | kubectl apply -f - | Out-Null
Ok "Namespaces ready (app, monitoring)"

# 4) Install ingress-nginx
Info "Installing ingress-nginx for kind..."
try {
  & kubectl get ns ingress-nginx *> $null
  Ok "ingress-nginx already installed"
} catch {
  & kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml | Write-Host
}

Info "Waiting for ingress-nginx controller..."
& kubectl -n ingress-nginx rollout status deployment/ingress-nginx-controller | Write-Host
Ok "ingress-nginx ready"

# 5) Helm repos
Info "Adding Helm repos..."
& helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>$null | Out-Null
& helm repo add bitnami https://charts.bitnami.com/bitnami 2>$null | Out-Null
& helm repo update | Write-Host
Ok "Helm repos updated"

# 6) Install Prometheus+Grafana (kube-prometheus-stack)
Info "Installing kube-prometheus-stack..."
& helm upgrade --install kps prometheus-community/kube-prometheus-stack -n monitoring | Write-Host

Info "Waiting for Grafana..."
& kubectl -n monitoring rollout status deployment/kps-grafana | Write-Host
Ok "Prometheus + Grafana ready"

# Print Grafana password
Info "Grafana login:"
try {
  $pwdB64 = & kubectl -n monitoring get secret kps-grafana -o jsonpath="{.data.admin-password}"
  $pwd = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($pwdB64))
  Write-Host ("  URL:  http://localhost:3000")
  Write-Host ("  User: admin")
  Write-Host ("  Pass: " + $pwd)
} catch {
  Write-Host "  Could not read Grafana password automatically."
}

# 7) Install PostgreSQL (Bitnami) using an inline values file
$valuesFile = Join-Path (Get-Location) "postgres-values.yaml"
@"
auth:
  username: appuser
  password: apppass
  database: appdb
primary:
  persistence:
    enabled: true
    size: 1Gi
"@ | Set-Content -Encoding UTF8 $valuesFile

Info "Installing PostgreSQL..."
& helm upgrade --install pg bitnami/postgresql -n app -f $valuesFile | Write-Host

Info "Waiting for PostgreSQL..."
& kubectl -n app rollout status statefulset/pg-postgresql | Write-Host
Ok "PostgreSQL ready"

Info "Starting Grafana port-forward (leave this window open)."
Info "Press Ctrl+C when you want to stop."
& kubectl -n monitoring port-forward svc/kps-grafana 3000:80
