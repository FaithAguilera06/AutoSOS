# 🚀 AutoSOS Cloud Deployment Guide

This guide explains how to deploy your FaceNet, YOLOv8, and Ollama services to the cloud, removing the need for local backend processing.

## 📋 Overview

The cloud deployment includes:
- **API Gateway**: Central entry point for all services
- **FaceNet Service**: Facial recognition for payments
- **YOLOv8 Service**: Motorcycle diagnostic detection
- **Ollama Service**: AI chat diagnostics
- **Redis**: Caching and session management
- **Nginx**: Load balancing and SSL termination
- **Monitoring**: Prometheus and Grafana

## 🏗️ Architecture

```
Internet
    ↓
Nginx (Load Balancer)
    ↓
API Gateway
    ↓
┌─────────────┬─────────────┬─────────────┐
│ FaceNet     │ YOLOv8      │ Ollama      │
│ Service     │ Service     │ Service     │
│ (Port 8001) │ (Port 8002) │ (Port 11434)│
└─────────────┴─────────────┴─────────────┘
    ↓
Redis (Cache)
```

## 🚀 Quick Start

### 1. Prerequisites

- Docker and Docker Compose installed
- Cloud server (AWS EC2, Google Cloud, Azure VM, etc.)
- Domain name (optional, for SSL)
- Supabase project with API keys

### 2. Deploy to Cloud

```bash
# Clone your AutoSOS project
git clone <your-repo-url>
cd AutoSOS/cloud-deployment

# Copy and configure environment
cp env.example .env
nano .env  # Edit with your configuration

# Deploy services
./deploy.sh
```

### 3. Configure Environment

Edit `.env` file with your settings:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Cloud Domain (update with your actual domain)
CLOUD_DOMAIN=your-domain.com

# Security
JWT_SECRET_KEY=your-secure-jwt-secret
API_KEY=your-api-key
```

## 🌐 Cloud Platform Deployment

### AWS EC2 Deployment

1. **Launch EC2 Instance**:
   ```bash
   # Recommended instance type: t3.large or larger
   # OS: Ubuntu 20.04 LTS
   # Storage: 50GB+ SSD
   ```

2. **Install Docker**:
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose
   sudo usermod -aG docker $USER
   ```

3. **Configure Security Groups**:
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
   - Port 22 (SSH)

4. **Deploy**:
   ```bash
   git clone <your-repo>
   cd AutoSOS/cloud-deployment
   ./deploy.sh
   ```

### Google Cloud Platform

1. **Create VM Instance**:
   ```bash
   gcloud compute instances create autosos-ai \
     --image-family=ubuntu-2004-lts \
     --image-project=ubuntu-os-cloud \
     --machine-type=e2-standard-2 \
     --boot-disk-size=50GB
   ```

2. **Deploy**:
   ```bash
   gcloud compute ssh autosos-ai
   # Follow AWS deployment steps
   ```

### Azure VM Deployment

1. **Create Virtual Machine**:
   ```bash
   az vm create \
     --resource-group myResourceGroup \
     --name autosos-ai \
     --image UbuntuLTS \
     --size Standard_D2s_v3 \
     --admin-username azureuser
   ```

2. **Deploy**:
   ```bash
   az vm run-command invoke \
     --resource-group myResourceGroup \
     --name autosos-ai \
     --command-id RunShellScript \
     --scripts "curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
   ```

## 🔧 Configuration

### Update Client App

1. **Update Service URLs**:
   ```typescript
   // src/app/services/cloud-config.service.ts
   private readonly CLOUD_BASE_URL = 'https://your-domain.com';
   ```

2. **Update Ollama Service**:
   ```typescript
   // src/app/services/ollama.service.ts
   private readonly baseUrl = 'https://your-domain.com/api/ollama';
   ```

3. **Update Facial Recognition Service**:
   ```typescript
   // Update your existing facial recognition service
   private readonly API_URL = 'https://your-domain.com/api/facenet';
   ```

4. **Update YOLOv8 Service**:
   ```typescript
   // Update your existing YOLOv8 service
   private readonly API_URL = 'https://your-domain.com/api/yolo';
   ```

### SSL Configuration

1. **Get SSL Certificate** (Let's Encrypt):
   ```bash
   sudo apt install certbot
   sudo certbot certonly --standalone -d your-domain.com
   ```

2. **Update Nginx Configuration**:
   ```bash
   # Uncomment SSL section in nginx.conf
   # Update certificate paths
   ```

3. **Restart Services**:
   ```bash
   docker-compose restart nginx
   ```

## 📊 Monitoring

### Access Monitoring Dashboards

- **Prometheus**: `http://your-domain.com:9090`
- **Grafana**: `http://your-domain.com:3000` (admin/admin)

### Key Metrics

- Request rates and response times
- Service health status
- Resource utilization
- Error rates

## 🔒 Security

### Production Security Checklist

- [ ] Enable SSL/TLS encryption
- [ ] Configure proper CORS policies
- [ ] Set up rate limiting
- [ ] Use strong API keys
- [ ] Enable firewall rules
- [ ] Regular security updates
- [ ] Monitor access logs

### Environment Variables Security

```bash
# Use strong, unique secrets
JWT_SECRET_KEY=$(openssl rand -base64 32)
API_KEY=$(openssl rand -hex 32)
```

## 🚀 Scaling

### Horizontal Scaling

1. **Load Balancer Configuration**:
   ```yaml
   # docker-compose.yml
   services:
     facenet-service:
       deploy:
         replicas: 3
   ```

2. **Auto-scaling** (AWS):
   ```bash
   # Use AWS Application Load Balancer
   # Configure auto-scaling groups
   ```

### Vertical Scaling

- **Memory**: Increase container memory limits
- **CPU**: Use more powerful instances
- **Storage**: Add persistent volumes

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy to Cloud
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to server
        run: |
          ssh user@your-server.com 'cd /path/to/autosos && git pull && docker-compose up -d --build'
```

## 🐛 Troubleshooting

### Common Issues

1. **Services Not Starting**:
   ```bash
   docker-compose logs [service-name]
   ```

2. **Out of Memory**:
   ```bash
   # Increase memory limits in docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 4G
   ```

3. **SSL Certificate Issues**:
   ```bash
   # Check certificate validity
   openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout
   ```

4. **Database Connection Issues**:
   ```bash
   # Check Supabase configuration
   curl -H "apikey: $SUPABASE_KEY" $SUPABASE_URL/rest/v1/
   ```

### Health Checks

```bash
# Check all services
curl https://your-domain.com/health

# Check individual services
curl https://your-domain.com/api/facenet/health
curl https://your-domain.com/api/yolo/health
curl https://your-domain.com/api/ollama/models
```

## 📈 Performance Optimization

### Caching Strategy

- **Redis**: Session and model caching
- **CDN**: Static asset delivery
- **Browser**: Client-side caching

### Resource Optimization

- **Model Quantization**: Use smaller models for mobile
- **Image Compression**: Optimize image uploads
- **Connection Pooling**: Reuse database connections

## 💰 Cost Optimization

### Cloud Cost Management

- **Spot Instances**: Use for non-critical workloads
- **Auto-scaling**: Scale down during low usage
- **Reserved Instances**: For predictable workloads
- **Monitoring**: Track resource usage

### Estimated Costs (Monthly)

- **AWS t3.large**: ~$60-80
- **Google Cloud e2-standard-2**: ~$50-70
- **Azure Standard_D2s_v3**: ~$70-90

## 🔄 Backup and Recovery

### Data Backup

```bash
# Backup Redis data
docker-compose exec redis redis-cli BGSAVE

# Backup models
docker-compose exec facenet-service tar -czf /backup/models.tar.gz /app/models
```

### Disaster Recovery

1. **Automated Backups**: Daily model and data backups
2. **Multi-region**: Deploy in multiple regions
3. **Health Monitoring**: Automated failover

## 📞 Support

### Getting Help

- Check service logs: `docker-compose logs -f`
- Monitor metrics: Grafana dashboard
- Review health status: `/health` endpoints

### Maintenance

- **Weekly**: Update dependencies
- **Monthly**: Security patches
- **Quarterly**: Performance review

---

## 🎉 Success!

Your AutoSOS AI services are now running in the cloud! Users can access:

- **Facial Recognition**: Secure payment authentication
- **Motorcycle Diagnostics**: AI-powered issue detection
- **Chat Diagnostics**: Intelligent problem analysis

The system automatically falls back to local services if cloud services are unavailable, ensuring reliability and performance.
