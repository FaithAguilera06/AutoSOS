# Alternative Routing Setup Guide

## 🚀 Quick Setup with OpenRouteService

### Step 1: Get OpenRouteService API Key
1. Go to [OpenRouteService.org](https://openrouteservice.org/)
2. Sign up for free account
3. Get your API key (2,000 free requests/day)

### Step 2: Deploy Alternative Service
1. Use the code in `cloud-deployment/alternative-routing-service/`
2. Deploy to Render with your ORS API key
3. Get your new service URL (e.g., `https://autosos-routing.onrender.com`)

### Step 3: Update Client Configuration
Update `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://atdibhoeaeqfgjswcqwx.supabase.co',
  supabaseAnonKey: 'your_supabase_key',
  mapboxAccessToken: 'pk.eyJ1IjoiYXV0b3NvczEyMyIsImEiOiJjbWdvNHJ0MDkxcjJtMm5va2lhNnB1YjR0In0.8hQ5bC4FlZKZFevZQvBzNg', // For maps only
  navigationServiceUrl: 'https://autosos-routing.onrender.com' // Your new routing service
};
```

## 🎯 Benefits

### Cost Comparison
- **Mapbox**: $0.50 per 1,000 requests
- **OpenRouteService**: FREE (2,000 requests/day)
- **Google Maps**: $5-7 per 1,000 requests
- **Here Maps**: FREE (250,000 requests/month)

### Reliability
- **Multiple Providers**: Easy to switch if one fails
- **No Vendor Lock-in**: Standard REST APIs
- **Backup Options**: Can implement multiple providers

## 🔄 Easy Provider Switching

### Switch to Google Maps
```python
# In app.py, replace ORS endpoints with:
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
url = f"https://maps.googleapis.com/maps/api/directions/json?origin={origin_lat},{origin_lng}&destination={dest_lat},{dest_lng}&key={GOOGLE_API_KEY}"
```

### Switch to Here Maps
```python
# In app.py, replace ORS endpoints with:
HERE_API_KEY = os.getenv('HERE_API_KEY')
url = f"https://router.hereapi.com/v8/routes?apikey={HERE_API_KEY}&origin={origin_lat},{origin_lng}&destination={dest_lat},{dest_lng}"
```

## 🛠️ Implementation Steps

1. **Deploy Alternative Service** to Render
2. **Update Environment Variables** in your app
3. **Test the Service** with your app
4. **Keep Mapbox** for map display only
5. **Use Alternative Service** for routing/navigation

## 📊 Current Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │    │  Alternative     │    │   OpenRoute     │
│                 │    │  Routing Service │    │   Service       │
│ Public Token    │───▶│ Free/Cheap API   │───▶│ Free Tier       │
│ (pk.) - Maps    │    │ Key              │    │ 2,000 req/day   │
│ Display Only    │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🎉 Result

- ✅ **Maps Display**: Using Mapbox public token
- ✅ **Routing/Navigation**: Using free alternative service
- ✅ **Cost Savings**: No more expensive Mapbox routing
- ✅ **Reliability**: Multiple provider options
- ✅ **Easy Migration**: Drop-in replacement
