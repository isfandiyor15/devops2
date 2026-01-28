# DevOps 2 Project Evidence

## Reproduction Steps

### 1. Requirements
- Docker
- Kind
- Helm
- Kubectl

### 2. Cluster Setup
```powershell
kind create cluster --name devops-assignment
```

### 3. Install Monitoring (Prometheus + Grafana)
```powershell
kubectl create ns monitoring
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install kps prometheus-community/kube-prometheus-stack -n monitoring --wait
```

### 4. Install PostgreSQL
```powershell
kubectl create ns app
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm upgrade --install pg bitnami/postgresql -n app -f infra/db/values-postgres.yaml --wait
```

### 5. Deploy Application
```powershell
helm upgrade --install myapp ./helm/myapp -n app --wait
# Note: Ensure image is public or secret is configured if using private ghcr
```

### 6. Verify Deployment
```powershell
kubectl get pods -n app
```

### 7. Port Forwarding
**App (in one terminal):**
```powershell
kubectl port-forward svc/myapp 8080:80 -n app
```
Access: http://localhost:8080

**Grafana (in another terminal):**
```powershell
kubectl port-forward svc/kps-grafana 3000:80 -n monitoring
```
Access: http://localhost:3000 (admin/prom-operator)

**Prometheus (optional):**
```powershell
kubectl port-forward svc/kps-kube-prometheus-stack-prometheus 9090:9090 -n monitoring
```

## Verification Checks

### Curl Checks
```powershell
curl http://localhost:8080/healthz
curl http://localhost:8080/readyz
curl http://localhost:8080/products
curl http://localhost:8080/metrics | findstr http_requests_total
```

### Prometheus Queries (Grafana/Prometheus UI)
- **RPS**: `sum(rate(http_requests_total[1m]))`
- **Error Rate**: `sum(rate(http_requests_total{status_code=~"5.."}[5m]))`
- **P95 Latency**: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`
- **Target UP**: `up{job="myapp"}`

## Manual Evidence Checklist
User must capture screenshots of:
1. [ ] GitHub Actions successful run.
2. [ ] GHCR Packages showing `latest` and `sha` tags.
3. [ ] Grafana Explore showing app metrics queries above.
4. [ ] Lens (or kubectl) showing app pods, Postgres StatefulSet, PVC.
5. [ ] Browser UI at `http://localhost:8080` showing products page working.
6. [ ] Prometheus target UP (via Port Forward 9090 > Status > Targets).

## Manual GitHub Setting
- Go to Repository Settings > Branches.
- Add branch protection rule for `main`.
- Check "Require status checks to pass before merging".
- Search for "build-and-test" job or similar.
