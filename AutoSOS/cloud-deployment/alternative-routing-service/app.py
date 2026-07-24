from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# OpenRouteService API Key
ORS_API_KEY = os.getenv('ORS_API_KEY', 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjNmNWM2NzE3M2VhOTRjZGQ4ZWY2MGE4NzcwZGNhMjY1IiwiaCI6Im11cm11cjY0In0=')
ORS_BASE_URL = 'https://api.openrouteservice.org'

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'alternative-routing-service',
        'provider': 'OpenRouteService',
        'version': '1.0.0'
    })

@app.route('/api/directions', methods=['POST'])
def get_directions():
    """
    Get directions between two points using OpenRouteService
    """
    try:
        data = request.get_json()
        
        # Validate required parameters
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        origin_lat = data.get('origin_lat')
        origin_lng = data.get('origin_lng')
        destination_lat = data.get('destination_lat')
        destination_lng = data.get('destination_lng')
        
        if not all([origin_lat, origin_lng, destination_lat, destination_lng]):
            return jsonify({
                'error': 'Missing required parameters: origin_lat, origin_lng, destination_lat, destination_lng'
            }), 400
        
        # OpenRouteService Directions API
        url = f"{ORS_BASE_URL}/v2/directions/driving-car"
        
        headers = {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json'
        }
        
        body = {
            "coordinates": [
                [origin_lng, origin_lat],
                [destination_lng, destination_lat]
            ],
            "format": "geojson",
            "options": {
                "avoid_features": ["highways"],
                "avoid_borders": "controlled"
            }
        }
        
        # Make request to OpenRouteService API
        response = requests.post(url, headers=headers, json=body)
        
        if response.status_code == 200:
            # Convert OpenRouteService response to Mapbox-like format
            ors_data = response.json()
            mapbox_format = convert_ors_to_mapbox_format(ors_data)
            return jsonify(mapbox_format)
        else:
            return jsonify({
                'error': f'OpenRouteService API error: {response.status_code}',
                'details': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500

@app.route('/api/geocoding', methods=['POST'])
def geocoding():
    """
    Geocoding service using OpenRouteService
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        query = data.get('query')
        lat = data.get('lat')
        lng = data.get('lng')
        
        if query:
            # Forward geocoding
            url = f"{ORS_BASE_URL}/geocode/search"
            headers = {
                'Authorization': ORS_API_KEY,
                'Content-Type': 'application/json'
            }
            params = {
                'text': query,
                'boundary.country': 'PH',
                'size': 5
            }
        elif lat and lng:
            # Reverse geocoding
            url = f"{ORS_BASE_URL}/geocode/reverse"
            headers = {
                'Authorization': ORS_API_KEY,
                'Content-Type': 'application/json'
            }
            params = {
                'point.lon': lng,
                'point.lat': lat,
                'size': 1
            }
        else:
            return jsonify({'error': 'Missing required parameter: query or lat/lng'}), 400
        
        # Make request to OpenRouteService API
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            # Convert OpenRouteService response to Mapbox-like format
            ors_data = response.json()
            mapbox_format = convert_ors_geocoding_to_mapbox_format(ors_data)
            return jsonify(mapbox_format)
        else:
            return jsonify({
                'error': f'OpenRouteService API error: {response.status_code}',
                'details': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500

def convert_ors_to_mapbox_format(ors_data):
    """Convert OpenRouteService directions response to Mapbox format"""
    try:
        if 'features' in ors_data and len(ors_data['features']) > 0:
            feature = ors_data['features'][0]
            properties = feature.get('properties', {})
            summary = properties.get('summary', {})
            
            # Convert to Mapbox format
            mapbox_response = {
                'routes': [{
                    'geometry': feature.get('geometry', {}),
                    'legs': [{
                        'distance': summary.get('distance', 0),
                        'duration': summary.get('duration', 0),
                        'steps': []
                    }],
                    'distance': summary.get('distance', 0),
                    'duration': summary.get('duration', 0)
                }],
                'waypoints': []
            }
            return mapbox_response
        else:
            return {'routes': [], 'waypoints': []}
    except Exception as e:
        return {'routes': [], 'waypoints': []}

def convert_ors_geocoding_to_mapbox_format(ors_data):
    """Convert OpenRouteService geocoding response to Mapbox format"""
    try:
        features = []
        if 'features' in ors_data:
            for feature in ors_data['features']:
                geometry = feature.get('geometry', {})
                properties = feature.get('properties', {})
                
                # Convert to Mapbox format
                mapbox_feature = {
                    'id': feature.get('id', ''),
                    'type': 'Feature',
                    'place_type': ['place'],
                    'relevance': 1,
                    'properties': properties,
                    'text': properties.get('label', ''),
                    'place_name': properties.get('label', ''),
                    'center': geometry.get('coordinates', [0, 0]),
                    'geometry': geometry
                }
                features.append(mapbox_feature)
        
        return {
            'type': 'FeatureCollection',
            'features': features
        }
    except Exception as e:
        return {'type': 'FeatureCollection', 'features': []}

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
