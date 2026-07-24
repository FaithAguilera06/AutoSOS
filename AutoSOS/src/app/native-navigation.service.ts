import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

export interface NativeNavigationParams {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  profile?: 'driving' | 'driving-traffic' | 'walking' | 'cycling';
}

@Injectable({ providedIn: 'root' })
export class NativeNavigationService {
  /**
   * Returns true when running on a native platform where Mapbox Navigation SDK can be used.
   */
  isNative(): boolean {
    const platform = Capacitor.getPlatform();
    return platform === 'ios' || platform === 'android';
  }

  /**
   * Launch navigation using the best available option.
   * - If native, this should call the Mapbox Navigation SDK (to be wired once plugin is added)
   * - Otherwise, opens Mapbox web directions as a fallback
   */
  async navigate(params: NativeNavigationParams): Promise<void> {
    if (this.isNative()) {
      // TODO: Replace with actual native Mapbox Navigation SDK call once plugin is integrated.
      // For now, fall back to web directions even on native to keep UX working.
      return this.openWebDirections(params);
    }
    return this.openWebDirections(params);
  }

  private async openWebDirections(params: NativeNavigationParams): Promise<void> {
    const profile = params.profile ?? 'driving';
    const origin = `${params.origin.longitude},${params.origin.latitude}`;
    const dest = `${params.destination.longitude},${params.destination.latitude}`;
    const url = `https://www.mapbox.com/directions/?route=${origin};${dest}&access_token=pk.eyJ1IjoiZGVtb3VzZXIiLCJhIjoiY2xleGFtcGxlIn0.DEMO_TOKEN&profile=${profile}`;
    window.open(url, '_blank');
  }
}


