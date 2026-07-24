# 🎨 Render Deployment Guide for AutoSOS

Since Railway's free plan has limitations, let's deploy your AutoSOS AI services to Render instead.

## 🎯 Why Render?

- **Free Tier**: 750 hours/month, 512MB RAM per service
- **Easy Docker Deployment**: Simple configuration
- **Automatic SSL**: HTTPS enabled by default
- **No Credit Card Required**: Truly free
- **Sleep Mode**: Services sleep after 15 minutes of inactivity (wake up on request)

## 🚀 Quick Deployment Steps

### 1. Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended)
3. Connect your GitHub account

### 2. Deploy Your Services
1. **Go to your GitHub repository**: [https://github.com/isaiahalindada123-eng/autosos-ai-services](https://github.com/isaiahalindada123-eng/autosos-ai-services)
2. **Make sure your files are uploaded** (the cloud-deployment folder)
3. **Go to Render dashboard**
4. **Click "New +" → "Web Service"**
5. **Connect your GitHub repository**
6. **Select your repository**: `isaiahalindada123-eng/autosos-ai-services`

### 3. Configure Each Service

#### **API Gateway Service:**
- **Name**: `autosos-api-gateway`
- **Root Directory**: `cloud-deployment/api-gateway`
- **Environment**: `Docker`
- **Dockerfile Path**: `Dockerfile`
- **Environment Variables**:
  ```
  FACENET_SERVICE_URL=https://autosos-facenet.onrender.com
  YOLO_SERVICE_URL=https://autosos-yolo.onrender.com
  OLLAMA_SERVICE_URL=https://autosos-ollama.onrender.com
  REDIS_URL=redis://autosos-redis:6379
  SUPABASE_URL=your-supabase-url
  SUPABASE_KEY=your-supabase-key
  ```

#### **FaceNet Service:**
- **Name**: `autosos-facenet`
- **Root Directory**: `cloud-deployment/facenet-service`
- **Environment**: `Docker`
- **Dockerfile Path**: `Dockerfile`
- **Environment Variables**:
  ```
  SUPABASE_URL=your-supabase-url
  SUPABASE_KEY=your-supabase-key
  REDIS_URL=redis://autosos-redis:6379
  ```

#### **YOLOv8 Service:**
- **Name**: `autosos-yolo`
- **Root Directory**: `cloud-deployment/yolo-service`
- **Environment**: `Docker`
- **Dockerfile Path**: `Dockerfile`
- **Environment Variables**:
  ```
  SUPABASE_URL=your-supabase-url
  SUPABASE_KEY=your-supabase-key
  REDIS_URL=redis://autosos-redis:6379
  ```

#### **Ollama Service:**
- **Name**: `autosos-ollama`
- **Root Directory**: `cloud-deployment/ollama-service`
- **Environment**: `Docker`
- **Dockerfile Path**: `Dockerfile`

#### **Redis Database:**
- **Name**: `autosos-redis`
- **Type**: `Redis`
- **Plan**: `Free`

## 🔧 Environment Variables Setup

You'll need to set these in each service:

### **Required Variables:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

### **Service URLs (Update after deployment):**
```
FACENET_SERVICE_URL=https://autosos-facenet.onrender.com
YOLO_SERVICE_URL=https://autosos-yolo.onrender.com
OLLAMA_SERVICE_URL=https://autosos-ollama.onrender.com
REDIS_URL=redis://autosos-redis:6379
```

## 📱 Update Your Client App

After deployment, update your services:

```typescript
// src/app/services/cloud-config.service.ts
private readonly CLOUD_BASE_URL = 'https://autosos-api-gateway.onrender.com';

// src/app/services/ollama.service.ts
private readonly baseUrl = 'https://autosos-api-gateway.onrender.com/api/ollama';
```

## 🌐 Service Endpoints

Once deployed, your services will be available at:

- **API Gateway**: `https://autosos-api-gateway.onrender.com`
- **FaceNet**: `https://autosos-facenet.onrender.com`
- **YOLOv8**: `https://autosos-yolo.onrender.com`
- **Ollama**: `https://autosos-ollama.onrender.com`
- **Redis**: `redis://autosos-redis:6379`

## ⚠️ Important Notes

### **Sleep Mode:**
- Services sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- Subsequent requests are fast

### **Free Tier Limits:**
- 750 hours/month per service
- 512MB RAM per service
- 100GB bandwidth/month

### **Deployment Order:**
1. Deploy Redis first
2. Deploy individual services
3. Deploy API Gateway last (it depends on other services)

## 🚀 Alternative: Single Service Deployment

If you want to deploy everything as one service:

1. **Create one Web Service**
2. **Root Directory**: `cloud-deployment`
3. **Dockerfile Path**: `docker-compose.yml`
4. **Environment**: `Docker`

This will deploy all services together but may hit memory limits.

## 🎉 Success!

Your AutoSOS AI services will be running on Render with:
- ✅ **Facial Recognition** for payments
- ✅ **Motorcycle Diagnostics** with YOLOv8
- ✅ **AI Chat Diagnostics** with Ollama
- ✅ **Automatic SSL** and HTTPS
- ✅ **Free hosting** with sleep mode

## 📞 Support

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Community**: [Render Community](https://community.render.com)

Would you like me to help you with the specific deployment steps on Render?
