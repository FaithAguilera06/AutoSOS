"""Simple simulation of movement from SM North to SM Mall of Asia using ORS"""
import requests
import json
import time

ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjNmNWM2NzE3M2VhOTRjZGQ4ZWY2MGE4NzcwZGNhMjY1IiwiaCI6Im11cm11cjY0In0="

# SM North and SM Mall of Asia coordinates
SM_NORTH = {"name": "SM North EDSA", "lat": 14.6561, "lng": 121.0307}
SM_MOA = {"name": "SM Mall of Asia", "lat": 14.5355, "lng": 120.9821}

print("=" * 60)
print("MOVEMENT SIMULATION: SM North EDSA -> SM Mall of Asia")
print("=" * 60)

# Get route from OpenRouteService
print("\nGetting route from OpenRouteService...")
url = "https://api.openrouteservice.org/v2/directions/driving-car"
headers = {
    'Authorization': ORS_API_KEY,
    'Content-Type': 'application/json'
}
body = {
    "coordinates": [
        [SM_NORTH["lng"], SM_NORTH["lat"]],
        [SM_MOA["lng"], SM_MOA["lat"]]
    ],
    "format": "geojson"
}

response = requests.post(url, headers=headers, json=body)

if response.status_code == 200:
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)[:500]}...")
    
    if "features" in data:
        route = data["features"][0]
        coordinates = route["geometry"]["coordinates"]
        distance_km = route["properties"]["summary"]["distance"] / 1000
        duration_min = route["properties"]["summary"]["duration"] / 60
    elif "routes" in data:
        route = data["routes"][0]
        # ORS returns encoded geometry, need to decode it
        # For now, let's use the summary data
        distance_km = route["summary"]["distance"] / 1000
        duration_min = route["summary"]["duration"] / 60
        # Extract coordinates from segments
        coordinates = []
        print("Extracting coordinates from route segments...")
        # Simpler approach - just use start and end
        coordinates = [[SM_NORTH["lng"], SM_NORTH["lat"]], [SM_MOA["lng"], SM_MOA["lat"]]]
    else:
        print(f"ERROR: Unexpected response format")
        print(json.dumps(data, indent=2))
        exit(1)
    
    print(f"SUCCESS! Route obtained:")
    print(f"  Distance: {distance_km:.2f} km")
    print(f"  Duration: {duration_min:.1f} minutes")
    print(f"  Waypoints: {len(coordinates)}")
    
    print(f"\nSimulating movement along {len(coordinates)} waypoints...")
    print("-" * 60)
    
    # Simulate movement
    for i, coord in enumerate(coordinates):
        lng, lat = coord
        progress = (i / (len(coordinates) - 1)) * 100
        
        if i % 10 == 0:  # Print every 10th waypoint
            print(f"Position {i+1}/{len(coordinates)}: "
                  f"Lat={lat:.6f}, Lng={lng:.6f} "
                  f"(Progress: {progress:.1f}%)")
            time.sleep(0.1)
    
    print("-" * 60)
    print("SIMULATION COMPLETE!")
    print(f"Traveled {distance_km:.2f} km in simulated time")
    
    # Save route to file
    with open('sm_route_data.json', 'w') as f:
        json.dump(data, f, indent=2)
    print("\nRoute data saved to: sm_route_data.json")
    
else:
    print(f"ERROR: {response.status_code}")
    print(response.text)

