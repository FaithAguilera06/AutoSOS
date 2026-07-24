# Render Environment Variables Guide

## 🎯 **Your Supabase Credentials**

### **SUPABASE_URL:**
```
https://atdibhoeaeqfgjswcqwx.supabase.co
```

### **SUPABASE_KEY:**
```
sb_publishable_8zWSuqsDoSKDiWkz3Yd_eg_E7N1X7oj
```

### **REDIS_URL:**
```
redis://red-d3e380je5dus73fdhdp0:6379
```

## 🚀 **How to Add to Render Services**

### **For Each Service (FaceNet, YOLOv8, Ollama, API Gateway):**

1. **Go to your Render service**
2. **Click "Environment" tab**
3. **Click "Add Environment Variable"**
4. **Add these 3 variables:**

```
SUPABASE_URL = https://atdibhoeaeqfgjswcqwx.supabase.co
SUPABASE_KEY = sb_publishable_8zWSuqsDoSKDiWkz3Yd_eg_E7N1X7oj
REDIS_URL = redis://red-d3e380je5dus73fdhdp0:6379
```

5. **Click "Save Changes"**
6. **Go to "Deploy" tab**
7. **Click "Manual Deploy"**

## 📋 **Service-Specific Additional Variables**

### **API Gateway Service:**
```
FACENET_SERVICE_URL = https://autosos-facenet.onrender.com
YOLO_SERVICE_URL = https://autosos-yolo.onrender.com
OLLAMA_SERVICE_URL = https://autosos-ollama.onrender.com
```

*Note: Update these URLs with your actual Render service URLs after deployment*

## 🔧 **Troubleshooting**

- **Make sure there are no extra spaces** in the environment variable values
- **Don't include quotes** around the values
- **The Redis URL** should start with `redis://` not `https://`
- **Redeploy** after adding environment variables

## 📝 **Quick Copy-Paste:**

```
SUPABASE_URL=https://atdibhoeaeqfgjswcqwx.supabase.co
SUPABASE_KEY=sb_publishable_8zWSuqsDoSKDiWkz3Yd_eg_E7N1X7oj
REDIS_URL=redis://red-d3e380je5dus73fdhdp0:6379
```
