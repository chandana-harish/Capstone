# Kubernetes Manifests — Placeholder

This directory will contain all Kubernetes manifests for deploying the
Training Management System to a K8s cluster.

## Planned Structure

```
/k8s
├── namespace.yaml
├── /auth-service
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
├── /user-service
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
├── /training-service
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
├── /attendance-service
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
├── /frontend
│   ├── deployment.yaml
│   └── service.yaml
├── /mongodb
│   ├── auth-mongo-statefulset.yaml
│   ├── user-mongo-statefulset.yaml
│   ├── training-mongo-statefulset.yaml
│   └── attendance-mongo-statefulset.yaml
├── /secrets
│   └── tms-secrets.yaml   # (use Sealed Secrets / External Secrets in prod)
└── /ingress
    └── ingress.yaml
```

## Usage with kubectl

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/ --recursive
```

## Usage with Helm

See `/helm` directory (add Helm chart scaffolding here for ArgoCD).
