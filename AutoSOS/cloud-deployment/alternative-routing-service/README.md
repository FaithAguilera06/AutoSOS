# Alternative Routing Service

A routing service using OpenRouteService instead of Mapbox for cost-effective navigation.

## Features

- **Directions API**: Get driving directions between two points
- **Geocoding API**: Convert addresses to coordinates and vice versa
- **CORS Enabled**: Works with client-side applications
- **Cost-Effective**: Free tier with 2,000 requests/day
- **Mapbox Compatible**: Converts responses to Mapbox format

## Setup

### 1. Get OpenRouteService API Key
1. Go to [OpenRouteService](https://openrouteservice.org/)
2. Sign up for a free account
3. Get your API key from the dashboard

### 2. Environment Variables
Create a `.env` file with:
```env
ORS_API_KEY=your_ors_api_key_here
PORT=5000
FLASK_ENV=production
```

## API Endpoints

### Health Check
```
GET /health
```

### Get Directions
```
POST /api/directions
Content-Type: application/json

{
  "origin_lat": 14.5995,
  "origin_lng": 120.9842,
  "destination_lat": 14.6042,
  "destination_lng": 120.9822
}
```

### Geocoding
```
POST /api/geocoding
Content-Type: application/json

{
  "query": "Manila, Philippines"
}
```

## Alternative Providers

### 1. Google Maps API
- **Cost**: Pay-per-use
- **Quality**: Excellent
- **Setup**: Replace ORS endpoints with Google Maps API

### 2. Here Maps API
- **Free Tier**: 250,000 transactions/month
- **Quality**: Enterprise-grade
- **Setup**: Replace ORS endpoints with Here API

### 3. GraphHopper
- **Free Tier**: 500 requests/day
- **Quality**: Good
- **Setup**: Replace ORS endpoints with GraphHopper API

## Deployment

Deploy to Render, Heroku, or any cloud provider:

1. Connect your GitHub repository
2. Set environment variables
3. Deploy as a Web Service

## Benefits

- ✅ **Cost-Effective**: Free tier available
- ✅ **Reliable**: Multiple provider options
- ✅ **Compatible**: Works with existing Mapbox code
- ✅ **Scalable**: Easy to switch providers
