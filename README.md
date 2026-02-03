# 🚀 DevOps 2 Practical Project

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Kubernetes](https://img.shields.io/badge/kubernetes-kind-blue)
![Helm](https://img.shields.io/badge/helm-v3-orange)
![Prometheus](https://img.shields.io/badge/monitoring-prometheus-red)

A complete DevOps implementation featuring a Node.js application deployed on Kubernetes (Kind) with specific requirements for monitoring, persistence, and CI/CD.

## 📋 Architecture

- **Application**: Node.js (Express) with Prometheus middleware.
- **Database**: PostgreSQL (Bitnami Helm Chart) with Persistent Volume.
- **Monitoring**: Prometheus & Grafana (kube-prometheus-stack).
- **Deployment**: Custom Helm Chart.
- **CI/CD**: GitHub Actions (Lint, Test, Build, Push) + GitOps.
- **GitOps**: ArgoCD (Automated syncing from Helm chart).
- **Registry**: GitHub Container Registry (GHCR).

## 🛠 Prerequisites

Ensure you have the following tools installed:
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Kind](https://kind.sigs.k8s.io/)
- [Kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Helm](https://helm.sh/docs/intro/install/)
- [Git](https://git-scm.com/)

---

## ⚡ Quick Start

Follow these steps to deploy the entire stack from scratch.

### 1. Initialize Cluster
```powershell
kind create cluster --name devops-assignment
```

### 2. Install Infrastructure
**Monitoring Stack:**
```powershell
kubectl create ns monitoring
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install kps prometheus-community/kube-prometheus-stack -n monitoring --wait
```

**PostgreSQL Database:**
```powershell
kubectl create ns app
helm repo add bitnami https://charts.bitnami.com/bitnami
helm upgrade --install pg bitnami/postgresql -n app -f infra/db/values-postgres.yaml --wait
```

### 3. Deploy Application
```powershell
# Using the Helm Chart
helm upgrade --install myapp ./helm/myapp -n app --wait
```

### 4. Setup GitOps (ArgoCD)
Instead of manual Helm deployment, use ArgoCD for continuous delivery:
```powershell
# 1. Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 2. Deploy Application
kubectl apply -f argocd/application.yaml
```

### 4. Access the Application
The application is not exposed via Ingress by default in this local setup, so we use port-forwarding:

```powershell
kubectl port-forward svc/myapp 8080:80 -n app
```

Visit **[http://localhost:8080](http://localhost:8080)** to see the UI.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the web UI |
| `GET` | `/healthz` | Liveness probe (returns 200 "ok") |
| `GET` | `/readyz` | Readiness probe (checks DB connection) |
| `GET` | `/metrics` | Prometheus metrics |
| `GET` | `/products` | Fetch recent products from DB |
| `POST` | `/products` | Add a new product (JSON body: `{ "name": "foo", "price": 10 }`) |

## 📊 Monitoring & Observability

### Custom Metrics
The application exposes custom Prometheus metrics:
- `http_requests_total`: Counter for total requests by method, route, and status.
- `http_request_duration_seconds`: Histogram for response latency.
- `db_query_duration_seconds`: Histogram for database query duration.

### Accessing Grafana
To view dashboards:
```powershell
kubectl port-forward svc/kps-grafana 3000:80 -n monitoring
```
Access at [http://localhost:3000](http://localhost:3000) (Default user: `admin`, pass: `prom-operator`).

## 📂 Project Structure

```
.
├── .github/workflows   # CI/CD Pipeline
├── app                 # Node.js Application source
│   ├── src             # Backend logic
│   ├── public          # Frontend UI
│   └── tests           # Unit tests
├── docs                # Documentation & Evidence
├── helm/myapp          # Application Helm Chart
└── infra               # Infrastructure Configs (DB, Monitoring)
```

## 📝 License

This project is part of a DevOps practical assignment.
