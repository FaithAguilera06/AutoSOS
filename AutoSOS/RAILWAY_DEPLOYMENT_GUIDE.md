# 🚂 Railway Deployment Guide for AutoSOS

This guide will help you deploy your AutoSOS AI services to Railway cloud platform.

## 🎯 Why Railway?

- **Free Tier**: $5 credit monthly (perfect for small apps)
- **Easy Deployment**: Simple Docker deployment
- **Automatic SSL**: HTTPS enabled by default
- **Built-in Monitoring**: Real-time logs and metrics
- **Simple Pricing**: Pay only for what you use

## 🚀 Quick Start

### 1. Prerequisites

- Railway account (free at [railway.app](https://railway.app))
- Docker installed locally
- Your Supabase credentials

### 2. Install Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login
```

### 3. Deploy Your Services

```bash
# Navigate to cloud deployment directory
cd cloud-deployment

# Run the deployment script
./railway-deploy.sh
```

### 4. Manual Deployment (Alternative)

```bash
# Create new project
railway project new autosos-ai-services

# Add Redis service
railway add redis

# Set environment variables
railway variables set SUPABASE_URL="your-supabase-url"
railway variables set SUPABASE_KEY="your-supabase-key"

# Deploy
railway up
```

## 🔧 Configuration

### Environment Variables

Set these in Railway dashboard or via CLI:

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Optional
RAILWAY_ENVIRONMENT=production
```

### Service Configuration

Railway will automatically:
- Assign ports
- Provide HTTPS URLs
- Handle SSL certificates
- Manage service discovery

## 📱 Update Your Client App

### 1. Update Cloud Config Service

```typescript
// src/app/services/cloud-config.service.ts
private readonly CLOUD_BASE_URL = 'https://your-railway-app.railway.app';
```

### 2. Update Ollama Service

```typescript
// src/app/services/ollama.service.ts
private readonly baseUrl = 'https://your-railway-app.railway.app/api/ollama';
```

### 3. Update Other Services

```typescript
// Update your existing services
private readonly API_URL = 'https://your-railway-app.railway.app/api/facenet';
private readonly YOLO_API_URL = 'https://your-railway-app.railway.app/api/yolo';
```

## 🌐 Service Endpoints

Once deployed, your services will be available at:

- **Main API**: `https://your-app.railway.app/api/`
- **Health Check**: `https://your-app.railway.app/health`
- **FaceNet**: `https://your-app.railway.app/api/facenet/`
- **YOLOv8**: `https://your-app.railway.app/api/yolo/`
- **Ollama**: `https://your-app.railway.app/api/ollama/`

## 📊 Monitoring

### View Logs

```bash
# View real-time logs
railway logs

# View logs for specific service
railway logs --service api-gateway
```

### Check Status

```bash
# Check deployment status
railway status

# View service metrics
railway metrics
```

### Railway Dashboard

Visit [railway.app/dashboard](https://railway.app/dashboard) to:
- View service health
- Monitor resource usage
- Check deployment history
- Manage environment variables

## 🔒 Security

Railway automatically provides:
- HTTPS encryption
- Secure environment variables
- Network isolation
- Automatic security updates

## 💰 Cost Management

### Free Tier Limits

- **$5 credit monthly**
- **512MB RAM per service**
- **1GB storage**
- **100GB bandwidth**

### Cost Optimization Tips

1. **Use lightweight models** (already configured)
2. **Enable Redis caching** (reduces API calls)
3. **Monitor usage** in Railway dashboard
4. **Scale down** during low usage periods

### Estimated Monthly Cost

- **Small deployment**: $0-5 (within free tier)
- **Medium usage**: $5-15
- **High usage**: $15-30

## 🚀 Scaling

### Horizontal Scaling

```bash
# Scale specific service
railway scale --service api-gateway --replicas 2
```

### Vertical Scaling

```bash
# Increase memory
railway variables set MEMORY_LIMIT=1G
```

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway login --token ${{ secrets.RAILWAY_TOKEN }}
          railway up
```

### Automatic Deployments

Railway can automatically deploy when you push to GitHub:
1. Connect your GitHub repository
2. Enable automatic deployments
3. Push to trigger deployment

## 🐛 Troubleshooting

### Common Issues

1. **Out of Memory**:
   ```bash
   # Check memory usage
   railway metrics
   
   # Scale up if needed
   railway scale --memory 1G
   ```

2. **Service Not Starting**:
   ```bash
   # Check logs
   railway logs --service api-gateway
   
   # Check environment variables
   railway variables
   ```

3. **Database Connection Issues**:
   ```bash
   # Check Redis connection
   railway connect redis
   ```

### Health Checks

```bash
# Test API endpoint
curl https://your-app.railway.app/health

# Test individual services
curl https://your-app.railway.app/api/facenet/health
curl https://your-app.railway.app/api/yolo/health
curl https://your-app.railway.app/api/ollama/models
```

## 📈 Performance Optimization

### Caching Strategy

- **Redis**: Session and model caching
- **Browser**: Client-side caching
- **CDN**: Static asset delivery (Railway handles this)

### Resource Optimization

- **Lightweight models**: Already configured for Railway
- **Connection pooling**: Automatic in Railway
- **Memory management**: Optimized Docker images

## 🔄 Backup and Recovery

### Data Backup

```bash
# Backup Redis data
railway connect redis
redis-cli BGSAVE

# Backup environment variables
railway variables > backup.env
```

### Disaster Recovery

1. **Automatic backups**: Railway handles infrastructure
2. **Environment variables**: Stored securely in Railway
3. **Code**: Version controlled in Git

## 📞 Support

### Getting Help

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Community**: [Railway Discord](https://discord.gg/railway)
- **Support**: [Railway Support](https://railway.app/support)

### Maintenance

- **Weekly**: Check usage and costs
- **Monthly**: Update dependencies
- **As needed**: Scale resources

## 🎉 Success!

Your AutoSOS AI services are now running on Railway! 

### What's Working:

✅ **Facial Recognition**: Secure payment authentication  
✅ **Motorcycle Diagnostics**: AI-powered issue detection  
✅ **Chat Diagnostics**: Intelligent problem analysis  
✅ **Automatic SSL**: HTTPS encryption  
✅ **Monitoring**: Real-time logs and metrics  
✅ **Scaling**: Easy resource management  

### Next Steps:

1. **Test your services** using the provided endpoints
2. **Update your client app** with the Railway URLs
3. **Monitor usage** in the Railway dashboard
4. **Scale as needed** based on usage patterns

Your users can now access powerful AI services without any local backend requirements!
