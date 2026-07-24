import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface CloudServiceConfig {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastChecked: Date;
  responseTime?: number;
}

export interface CloudHealthStatus {
  gateway: boolean;
  services: {
    facenet: boolean;
    yolo: boolean;
    ollama: boolean;
  };
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class CloudConfigService {
  private readonly CLOUD_BASE_URL = 'https://autosos-api-gateway.onrender.com'; // AutoSOS Cloud API Gateway
  private readonly LOCAL_FALLBACK = true; // Enable local fallback when cloud is unavailable
  
  private cloudAvailableSubject = new BehaviorSubject<boolean>(false);
  public cloudAvailable$ = this.cloudAvailableSubject.asObservable();
  
  private serviceConfigs: CloudServiceConfig[] = [
    {
      name: 'api-gateway',
      url: `${this.CLOUD_BASE_URL}/api`,
      status: 'unknown',
      lastChecked: new Date()
    },
    {
      name: 'facenet',
      url: `${this.CLOUD_BASE_URL}/api/facenet`,
      status: 'unknown',
      lastChecked: new Date()
    },
    {
      name: 'yolo',
      url: `${this.CLOUD_BASE_URL}/api/yolo`,
      status: 'unknown',
      lastChecked: new Date()
    },
    {
      name: 'ollama',
      url: `${this.CLOUD_BASE_URL}/api/ollama`,
      status: 'unknown',
      lastChecked: new Date()
    }
  ];

  constructor(private http: HttpClient) {
    this.checkCloudHealth();
  }

  /**
   * Check overall cloud health
   */
  checkCloudHealth(): Observable<CloudHealthStatus> {
    return this.http.get<CloudHealthStatus>(`${this.CLOUD_BASE_URL}/health`)
      .pipe(
        map(response => {
          this.cloudAvailableSubject.next(response.gateway);
          this.updateServiceStatus('api-gateway', response.gateway);
          this.updateServiceStatus('facenet', response.services.facenet);
          this.updateServiceStatus('yolo', response.services.yolo);
          this.updateServiceStatus('ollama', response.services.ollama);
          return response;
        }),
        catchError(error => {
          console.warn('Cloud services unavailable, using local fallback:', error);
          this.cloudAvailableSubject.next(false);
          this.markAllServicesUnhealthy();
          throw error;
        })
      );
  }

  /**
   * Get service configuration
   */
  getServiceConfig(serviceName: string): CloudServiceConfig | undefined {
    return this.serviceConfigs.find(config => config.name === serviceName);
  }

  /**
   * Get all service configurations
   */
  getAllServiceConfigs(): CloudServiceConfig[] {
    return [...this.serviceConfigs];
  }

  /**
   * Check if cloud is available
   */
  isCloudAvailable(): boolean {
    return this.cloudAvailableSubject.value;
  }

  /**
   * Get service URL with fallback
   */
  getServiceUrl(serviceName: string, fallbackUrl?: string): string {
    const config = this.getServiceConfig(serviceName);
    
    if (config && config.status === 'healthy' && this.isCloudAvailable()) {
      return config.url;
    }
    
    // Return fallback URL if provided
    if (fallbackUrl) {
      return fallbackUrl;
    }
    
    // Default local fallback URLs
    const localFallbacks: { [key: string]: string } = {
      'facenet': 'http://localhost:8001',
      'yolo': 'https://autosos-yolo.onrender.com', // Use cloud YOLOv8 service as fallback
      'ollama': 'http://localhost:11434'
    };
    
    return localFallbacks[serviceName] || config?.url || '';
  }

  /**
   * Update service status
   */
  private updateServiceStatus(serviceName: string, isHealthy: boolean): void {
    const config = this.getServiceConfig(serviceName);
    if (config) {
      config.status = isHealthy ? 'healthy' : 'unhealthy';
      config.lastChecked = new Date();
    }
  }

  /**
   * Mark all services as unhealthy
   */
  private markAllServicesUnhealthy(): void {
    this.serviceConfigs.forEach(config => {
      config.status = 'unhealthy';
      config.lastChecked = new Date();
    });
  }

  /**
   * Get cloud base URL
   */
  getCloudBaseUrl(): string {
    return this.CLOUD_BASE_URL;
  }

  /**
   * Check if local fallback is enabled
   */
  isLocalFallbackEnabled(): boolean {
    return this.LOCAL_FALLBACK;
  }

  /**
   * Test service connectivity
   */
  testServiceConnectivity(serviceName: string): Observable<boolean> {
    const config = this.getServiceConfig(serviceName);
    if (!config) {
      return new Observable(observer => {
        observer.next(false);
        observer.complete();
      });
    }

    const startTime = Date.now();
    
    return this.http.get(`${config.url}/health`)
      .pipe(
        map(() => {
          const responseTime = Date.now() - startTime;
          config.responseTime = responseTime;
          config.status = 'healthy';
          config.lastChecked = new Date();
          return true;
        }),
        catchError(() => {
          config.status = 'unhealthy';
          config.lastChecked = new Date();
          return [false];
        })
      );
  }

  /**
   * Get service status summary
   */
  getServiceStatusSummary(): { [key: string]: string } {
    const summary: { [key: string]: string } = {};
    this.serviceConfigs.forEach(config => {
      summary[config.name] = config.status;
    });
    return summary;
  }

  /**
   * Update cloud configuration (for dynamic configuration)
   */
  updateCloudConfig(newBaseUrl: string): void {
    // Update base URL
    (this as any).CLOUD_BASE_URL = newBaseUrl;
    
    // Update all service URLs
    this.serviceConfigs.forEach(config => {
      config.url = `${newBaseUrl}/api/${config.name}`;
    });
    
    // Recheck health
    this.checkCloudHealth().subscribe();
  }
}
