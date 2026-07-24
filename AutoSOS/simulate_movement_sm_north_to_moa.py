#!/usr/bin/env python3
"""
Simulation: Moving Person from SM North to SM Mall of Asia using OpenRouteService
This script simulates a person moving along the route between these two locations.
"""

import requests
import json
import time
import math
from typing import List, Tuple, Dict, Any
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from datetime import datetime

# OpenRouteService API Configuration
ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjNmNWM2NzE3M2VhOTRjZGQ4ZWY2MGE4NzcwZGNhMjY1IiwiaCI6Im11cm11cjY0In0="
ORS_BASE_URL = "https://api.openrouteservice.org"

# SM North and SM Mall of Asia coordinates (Manila, Philippines)
SM_NORTH = {
    "name": "SM North EDSA",
    "latitude": 14.6561,
    "longitude": 121.0307
}

SM_MALL_OF_ASIA = {
    "name": "SM Mall of Asia",
    "latitude": 14.5355,
    "longitude": 120.9821
}

class MovementSimulator:
    def __init__(self):
        self.route_coordinates = []
        self.current_position_index = 0
        self.simulation_speed = 1.0  # Speed multiplier (1.0 = normal speed)
        self.total_distance = 0
        self.total_duration = 0
        
    def get_route_from_ors(self) -> Dict[str, Any]:
        """Get route from OpenRouteService API"""
        print("🗺️  Getting route from OpenRouteService...")
        
        url = f"{ORS_BASE_URL}/v2/directions/driving-car"
        headers = {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json'
        }
        
        body = {
            "coordinates": [
                [SM_NORTH["longitude"], SM_NORTH["latitude"]],
                [SM_MALL_OF_ASIA["longitude"], SM_MALL_OF_ASIA["latitude"]]
            ],
            "format": "geojson",
            "options": {
                "avoid_features": ["highways"],
                "avoid_borders": "controlled"
            }
        }
        
        try:
            response = requests.post(url, headers=headers, json=body)
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Route obtained successfully!")
                return data
            else:
                print(f"❌ Error getting route: {response.status_code}")
                print(f"Response: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Exception getting route: {e}")
            return None
    
    def extract_route_coordinates(self, route_data: Dict[str, Any]) -> List[Tuple[float, float]]:
        """Extract coordinates from route data"""
        coordinates = []
        
        if route_data and "features" in route_data:
            feature = route_data["features"][0]
            if "geometry" in feature and "coordinates" in feature["geometry"]:
                coordinates = feature["geometry"]["coordinates"]
                
                # Extract distance and duration
                if "properties" in feature:
                    props = feature["properties"]
                    self.total_distance = props.get("summary", {}).get("distance", 0) / 1000  # Convert to km
                    self.total_duration = props.get("summary", {}).get("duration", 0) / 60   # Convert to minutes
                    
                    print(f"📍 Route Distance: {self.total_distance:.2f} km")
                    print(f"⏱️  Route Duration: {self.total_duration:.1f} minutes")
        
        return coordinates
    
    def calculate_distance_between_points(self, point1: Tuple[float, float], point2: Tuple[float, float]) -> float:
        """Calculate distance between two points using Haversine formula"""
        lat1, lon1 = point1
        lat2, lon2 = point2
        
        # Convert to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of earth in kilometers
        r = 6371
        return c * r
    
    def simulate_movement(self, coordinates: List[Tuple[float, float]], duration_minutes: float = 5.0):
        """Simulate movement along the route"""
        if not coordinates:
            print("❌ No coordinates to simulate")
            return
        
        print(f"🚶 Starting movement simulation...")
        print(f"📍 Total waypoints: {len(coordinates)}")
        print(f"⏱️  Simulation duration: {duration_minutes} minutes")
        
        # Calculate time per segment
        total_segments = len(coordinates) - 1
        time_per_segment = (duration_minutes * 60) / total_segments  # Convert to seconds
        
        print(f"⏱️  Time per segment: {time_per_segment:.2f} seconds")
        
        # Simulate movement
        for i in range(len(coordinates)):
            current_coord = coordinates[i]
            lat, lon = current_coord
            
            # Calculate progress
            progress = (i / (len(coordinates) - 1)) * 100
            
            # Calculate distance traveled
            distance_traveled = 0
            for j in range(i):
                if j < len(coordinates) - 1:
                    distance_traveled += self.calculate_distance_between_points(
                        coordinates[j], coordinates[j + 1]
                    )
            
            # Print current position
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"[{timestamp}] 🚶 Position {i+1}/{len(coordinates)}: "
                  f"Lat: {lat:.6f}, Lon: {lon:.6f} "
                  f"(Progress: {progress:.1f}%, Distance: {distance_traveled:.2f} km)")
            
            # Wait for next segment (except for last point)
            if i < len(coordinates) - 1:
                time.sleep(time_per_segment / self.simulation_speed)
        
        print("✅ Movement simulation completed!")
    
    def create_route_visualization(self, coordinates: List[Tuple[float, float]]):
        """Create a visualization of the route"""
        if not coordinates:
            print("❌ No coordinates to visualize")
            return
        
        print("📊 Creating route visualization...")
        
        # Extract latitudes and longitudes
        lons, lats = zip(*coordinates)
        
        # Create the plot
        plt.figure(figsize=(12, 8))
        
        # Plot the route
        plt.plot(lons, lats, 'b-', linewidth=2, label='Route')
        plt.plot(lons, lats, 'bo', markersize=3, alpha=0.6)
        
        # Mark start and end points
        plt.plot(lons[0], lats[0], 'go', markersize=10, label=f'Start: {SM_NORTH["name"]}')
        plt.plot(lons[-1], lats[-1], 'ro', markersize=10, label=f'End: {SM_MALL_OF_ASIA["name"]}')
        
        # Add labels and title
        plt.xlabel('Longitude')
        plt.ylabel('Latitude')
        plt.title('Route from SM North EDSA to SM Mall of Asia')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # Set equal aspect ratio
        plt.axis('equal')
        
        # Save the plot
        plt.savefig('sm_north_to_moa_route.png', dpi=300, bbox_inches='tight')
        print("✅ Route visualization saved as 'sm_north_to_moa_route.png'")
        
        # Show the plot
        plt.show()
    
    def create_animated_simulation(self, coordinates: List[Tuple[float, float]]):
        """Create an animated simulation of the movement"""
        if not coordinates:
            print("❌ No coordinates to animate")
            return
        
        print("🎬 Creating animated simulation...")
        
        # Extract latitudes and longitudes
        lons, lats = zip(*coordinates)
        
        # Create the figure and axis
        fig, ax = plt.subplots(figsize=(12, 8))
        
        # Plot the complete route
        ax.plot(lons, lats, 'b-', linewidth=2, alpha=0.5, label='Route')
        ax.plot(lons[0], lats[0], 'go', markersize=10, label=f'Start: {SM_NORTH["name"]}')
        ax.plot(lons[-1], lats[-1], 'ro', markersize=10, label=f'End: {SM_MALL_OF_ASIA["name"]}')
        
        # Initialize the moving point
        point, = ax.plot([], [], 'ro', markersize=8, label='Current Position')
        trail, = ax.plot([], [], 'r-', linewidth=1, alpha=0.7, label='Trail')
        
        # Set up the plot
        ax.set_xlabel('Longitude')
        ax.set_ylabel('Latitude')
        ax.set_title('Animated Movement: SM North EDSA → SM Mall of Asia')
        ax.legend()
        ax.grid(True, alpha=0.3)
        ax.axis('equal')
        
        # Set plot limits
        margin = 0.01
        ax.set_xlim(min(lons) - margin, max(lons) + margin)
        ax.set_ylim(min(lats) - margin, max(lats) + margin)
        
        # Animation data
        trail_x = []
        trail_y = []
        
        def animate(frame):
            if frame < len(coordinates):
                current_lon, current_lat = coordinates[frame]
                
                # Update current position
                point.set_data([current_lon], [current_lat])
                
                # Update trail
                trail_x.append(current_lon)
                trail_y.append(current_lat)
                trail.set_data(trail_x, trail_y)
                
                # Update title with progress
                progress = (frame / (len(coordinates) - 1)) * 100
                ax.set_title(f'Animated Movement: SM North EDSA → SM Mall of Asia (Progress: {progress:.1f}%)')
            
            return point, trail
        
        # Create animation
        anim = animation.FuncAnimation(fig, animate, frames=len(coordinates), 
                                     interval=100, blit=True, repeat=True)
        
        # Save animation
        print("💾 Saving animation as 'sm_north_to_moa_animation.gif'...")
        anim.save('sm_north_to_moa_animation.gif', writer='pillow', fps=10)
        print("✅ Animation saved as 'sm_north_to_moa_animation.gif'")
        
        # Show the animation
        plt.show()
    
    def run_simulation(self):
        """Run the complete simulation"""
        print("🎯 SM North to SM Mall of Asia Movement Simulation")
        print("=" * 50)
        
        # Get route from OpenRouteService
        route_data = self.get_route_from_ors()
        if not route_data:
            print("❌ Failed to get route data")
            return
        
        # Extract coordinates
        coordinates = self.extract_route_coordinates(route_data)
        if not coordinates:
            print("❌ Failed to extract route coordinates")
            return
        
        print(f"✅ Route loaded with {len(coordinates)} waypoints")
        
        # Create route visualization
        self.create_route_visualization(coordinates)
        
        # Run movement simulation
        print("\n" + "=" * 50)
        print("🚶 MOVEMENT SIMULATION")
        print("=" * 50)
        self.simulate_movement(coordinates, duration_minutes=3.0)  # 3-minute simulation
        
        # Create animated simulation
        print("\n" + "=" * 50)
        print("🎬 ANIMATED SIMULATION")
        print("=" * 50)
        self.create_animated_simulation(coordinates)
        
        print("\n✅ Simulation completed successfully!")
        print("📁 Generated files:")
        print("   - sm_north_to_moa_route.png (static route visualization)")
        print("   - sm_north_to_moa_animation.gif (animated movement)")

def main():
    """Main function"""
    simulator = MovementSimulator()
    simulator.run_simulation()

if __name__ == "__main__":
    main()
