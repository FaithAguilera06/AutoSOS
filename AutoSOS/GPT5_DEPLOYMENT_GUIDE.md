# 🚀 GPT-5 Integration Deployment Guide

## 📋 Prerequisites

### 1. OpenAI API Access
- **GPT-5 API Key**: Get access to GPT-5 when available
- **Billing Setup**: Configure OpenAI billing with spending limits
- **API Limits**: Set appropriate rate limits and quotas

### 2. Current System Requirements
- ✅ **Render Account**: For cloud deployment
- ✅ **Supabase Database**: Already configured
- ✅ **Redis**: For caching (included in Render)
- ✅ **Existing Services**: YOLOv8, FaceNet, Ollama

## 🔧 Step 1: Environment Configuration

### 1.1 Update Environment Variables

Add these to your Render environment variables:

```bash
# GPT-5 Configuration
OPENAI_API_KEY=your_gpt5_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
MAX_MONTHLY_COST=200.0
COST_ALERT_THRESHOLD=150.0
CACHE_DURATION=3600

# Cost Optimization
ENABLE_SMART_ROUTING=true
ENABLE_CACHING=true
ENABLE_COST_ALERTS=true
FALLBACK_TO_OLLAMA=true
```

### 1.2 Update API Gateway Dependencies

Add to your `cloud-deployment/api-gateway/requirements.txt`:

```txt
# Existing dependencies...
redis==5.0.1
structlog==23.2.0
prometheus-client==0.19.0
pydantic==2.5.0
python-multipart==0.0.6

# New GPT-5 dependencies
openai==1.3.0
```

## 🚀 Step 2: Deploy Updated API Gateway

### 2.1 Update Render Service

1. **Go to Render Dashboard**
2. **Find your API Gateway service**
3. **Update the service**:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
   - **Environment Variables**: Add the GPT-5 variables above

### 2.2 Deploy the Changes

```bash
# If using Git deployment
git add .
git commit -m "Add GPT-5 integration to API Gateway"
git push origin main

# Render will automatically deploy
```

## 📱 Step 3: Update Frontend

### 3.1 Add GPT-5 Service

The GPT-5 service is already created at `src/app/services/gpt5.service.ts`. You need to:

1. **Import the service** in your chatbot component:

```typescript
// In src/app/client/pages/diagnostic/chatbot/chatbot.page.ts
import { GPT5Service } from '../../../services/gpt5.service';

export class ChatbotPage {
  constructor(
    private gpt5Service: GPT5Service,
    private ollamaService: OllamaService
  ) {}
}
```

### 3.2 Update Chatbot Logic

Replace the existing `sendMessage()` method:

```typescript
async sendMessage() {
  if (!this.userInput.trim() || this.isTyping) return;

  const message: ChatMessage = {
    id: Date.now().toString(),
    text: this.userInput.trim(),
    timestamp: this.getCurrentTime()
  };

  this.chatMessages.push(message);
  this.userInput = '';
  this.showQuickActions = false;

  // Update diagnostic context
  this.updateDiagnosticContext(message.text);

  // Show typing indicator
  this.isTyping = true;

  try {
    let response: BotResponse;

    // Check if GPT-5 should be used
    if (this.gpt5Service.shouldUseGPT5(message.text)) {
      // Use GPT-5 with intelligent routing
      const gpt5Request = {
        user_message: message.text,
        user_tier: this.userTier || 'free',
        emergency_level: this.emergencyLevel || 'normal',
        yolo_detections: this.yoloDetections || []
      };

      const gpt5Response = await this.gpt5Service.generateDiagnostic(gpt5Request);
      response = this.convertGPT5Response(gpt5Response);
    } else {
      // Use Ollama for simple queries
      response = await this.generateOllamaResponse(message.text);
    }

    this.botResponses.push(response);
  } catch (error) {
    console.error('Error generating response:', error);
    // Fallback to mock response on error
    await this.simulateTyping();
    const fallbackResponse = this.generateAIResponse(message.text);
    this.botResponses.push(fallbackResponse);
    
    this.showErrorToast('Failed to get AI response. Using fallback.');
  } finally {
    this.isTyping = false;
  }
}

private convertGPT5Response(gpt5Response: any): BotResponse {
  return {
    id: Date.now().toString(),
    text: gpt5Response.response,
    timestamp: this.getCurrentTime(),
    model: gpt5Response.model_used,
    cost: gpt5Response.cost,
    cached: gpt5Response.cached,
    recommendations: gpt5Response.recommendations,
    severity: gpt5Response.severity,
    immediate_actions: gpt5Response.immediate_actions
  };
}
```

### 3.3 Add User Tier Management

Add user tier selection to your chatbot:

```typescript
// Add to chatbot.page.ts
userTier: 'free' | 'premium' | 'emergency' = 'free';
emergencyLevel: 'normal' | 'urgent' | 'critical' = 'normal';

setUserTier(tier: 'free' | 'premium' | 'emergency') {
  this.userTier = tier;
  this.gpt5Service.setUserTier(tier);
}

setEmergencyLevel(level: 'normal' | 'urgent' | 'critical') {
  this.emergencyLevel = level;
  this.gpt5Service.setEmergencyLevel(level);
}
```

## 🔄 Step 4: Update Camera Integration

### 4.1 Enhanced YOLOv8 + GPT-5 Integration

Update your camera page to use the combined diagnostic endpoint:

```typescript
// In src/app/client/pages/diagnostic/camera/camera.page.ts
async analyzeFrameWithYOLOAndGPT5(frameData: string) {
  try {
    // Convert frame to file
    const imageFile = this.dataURLtoFile(frameData, 'diagnostic.jpg');
    
    // Use combined diagnostic endpoint
    const response = await this.gpt5Service.completeDiagnostic(
      imageFile,
      'Analyze this motorcycle for issues',
      this.userTier || 'free',
      this.emergencyLevel || 'normal'
    );

    if (response.success) {
      // Update YOLO detections
      this.yoloDetections = response.data.visual_analysis.detections || [];
      
      // Update GPT-5 analysis
      this.gpt5Analysis = response.data.ai_analysis;
      
      // Show enhanced recommendations
      this.showEnhancedRecommendations(response.data.ai_analysis);
    }
  } catch (error) {
    console.error('Combined diagnostic failed:', error);
    // Fallback to YOLO only
    this.analyzeFrameWithYOLO(frameData);
  }
}

private showEnhancedRecommendations(analysis: any) {
  // Display GPT-5 recommendations with cost info
  this.recommendations = analysis.recommendations;
  this.immediateActions = analysis.immediate_actions;
  this.severity = analysis.severity;
  this.modelUsed = analysis.model_used;
  this.cost = analysis.cost;
}
```

## 📊 Step 5: Add Cost Monitoring

### 5.1 Cost Dashboard Component

Create a cost monitoring component:

```typescript
// src/app/components/cost-monitor/cost-monitor.component.ts
export class CostMonitorComponent implements OnInit {
  costMetrics$ = this.gpt5Service.costMetrics$;
  serviceStatus$ = this.gpt5Service.serviceStatus$;

  constructor(private gpt5Service: GPT5Service) {}

  ngOnInit() {
    this.gpt5Service.loadCostMetrics();
  }

  getCostOptimizationTips() {
    return this.gpt5Service.getCostOptimizationTips();
  }
}
```

### 5.2 Add to Main App

```typescript
// In your main app component or settings page
import { CostMonitorComponent } from './components/cost-monitor/cost-monitor.component';

// Add to your app module or use as standalone component
```

## 🧪 Step 6: Testing

### 6.1 Test GPT-5 Integration

```bash
# Test the API Gateway
curl -X POST "https://your-api-gateway.onrender.com/api/gpt5/diagnostic" \
  -H "Content-Type: application/json" \
  -d '{
    "user_message": "My motorcycle is making a strange noise",
    "user_tier": "free",
    "emergency_level": "normal"
  }'
```

### 6.2 Test Combined Diagnostic

```bash
# Test YOLOv8 + GPT-5 combination
curl -X POST "https://your-api-gateway.onrender.com/api/diagnostic/complete" \
  -F "image_file=@test_image.jpg" \
  -F "user_message=Check this motorcycle for issues" \
  -F "user_tier=premium" \
  -F "emergency_level=normal"
```

### 6.3 Test Cost Metrics

```bash
# Check cost metrics
curl "https://your-api-gateway.onrender.com/api/gpt5/cost-metrics"
```

## 🔍 Step 7: Monitoring & Alerts

### 7.1 Set Up Monitoring

1. **Render Logs**: Monitor API Gateway logs for errors
2. **Cost Alerts**: Set up OpenAI billing alerts
3. **Performance Metrics**: Monitor response times and success rates

### 7.2 Health Checks

```bash
# Check service health
curl "https://your-api-gateway.onrender.com/health"

# Expected response:
{
  "status": "healthy",
  "gateway": true,
  "services": {
    "facenet": true,
    "yolo": true,
    "ollama": true,
    "gpt5": true
  },
  "timestamp": 1234567890
}
```

## 🚨 Step 8: Cost Controls

### 8.1 Set Up Billing Alerts

1. **OpenAI Dashboard**: Set spending limits
2. **Render Monitoring**: Monitor service usage
3. **Custom Alerts**: Implement cost threshold alerts

### 8.2 Emergency Controls

```typescript
// Add emergency cost controls to your service
if (monthlyCost >= MAX_MONTHLY_COST) {
  // Switch to Ollama only
  this.enableOllamaOnlyMode();
  
  // Notify users
  this.showCostAlert('Monthly limit reached. Using free diagnostic mode.');
}
```

## 📈 Step 9: Performance Optimization

### 9.1 Caching Strategy

- **Common Questions**: Cache for 24 hours
- **YOLOv8 Results**: Cache for 12 hours
- **Emergency Responses**: Cache for 1 hour

### 9.2 Request Optimization

- **Batch Similar Requests**: Group related queries
- **Prompt Optimization**: Use concise, focused prompts
- **Smart Routing**: Use GPT-5 only when necessary

## 🎯 Step 10: User Experience

### 10.1 User Tier Benefits

```typescript
const TIER_BENEFITS = {
  free: {
    gpt5_requests: 'Limited to complex queries',
    cost: 'Free for simple diagnostics',
    features: ['Basic diagnostics', 'YOLOv8 detection', 'Ollama chat']
  },
  premium: {
    gpt5_requests: 'Unlimited GPT-5 access',
    cost: '$10/month',
    features: ['Advanced diagnostics', 'Priority support', 'Cost monitoring']
  },
  enterprise: {
    gpt5_requests: 'Unlimited with custom limits',
    cost: 'Custom pricing',
    features: ['White-label', 'API access', 'Custom models']
  }
};
```

### 10.2 Cost Transparency

Show users:
- Current model being used (GPT-5 vs Ollama)
- Cost per request (if applicable)
- Cache status (free vs paid)
- Monthly usage statistics

## ✅ Deployment Checklist

- [ ] **Environment Variables**: GPT-5 API key and settings configured
- [ ] **API Gateway**: Updated with GPT-5 integration
- [ ] **Frontend Service**: GPT-5 service integrated
- [ ] **Chatbot**: Updated to use intelligent routing
- [ ] **Camera**: Enhanced with YOLOv8 + GPT-5 combination
- [ ] **Cost Monitoring**: Dashboard and alerts set up
- [ ] **Testing**: All endpoints tested and working
- [ ] **Monitoring**: Health checks and logging configured
- [ ] **Cost Controls**: Billing limits and emergency controls active
- [ ] **User Experience**: Tier benefits and cost transparency implemented

## 🚀 Go Live

Once all steps are completed:

1. **Deploy to Production**: Push all changes to Render
2. **Monitor Performance**: Watch logs and metrics
3. **User Testing**: Test with real users
4. **Cost Monitoring**: Track spending and optimize
5. **Iterate**: Improve based on user feedback

## 📞 Support

If you encounter issues:

1. **Check Logs**: Review Render service logs
2. **Test Endpoints**: Use curl commands to test APIs
3. **Monitor Costs**: Check OpenAI billing dashboard
4. **Fallback**: Ensure Ollama fallback is working
5. **Documentation**: Refer to cost optimization guide

Your AutoSOS system now has intelligent GPT-5 integration with cost optimization! 🎉
