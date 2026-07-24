import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, timeout, map, first } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface YOLOServiceInfo {
  url: string;
  type: 'local' | 'cloud' | 'supabase';
  isAvailable: boolean;
  responseTime?: number;
  modelLoaded?: boolean;
  serviceType?: string;
  ipAddress?: string;
  port?: number;
  classes?: any;
}

@Injectable({
  providedIn: 'root'
})
export class YOLOServiceDetectorService {
  private currentServiceSubject = new BehaviorSubject<YOLOServiceInfo | null>(null);
  public currentService$ = this.currentServiceSubject.asObservable();

  private serviceUrls: YOLOServiceInfo[] = [];
  private detectionInProgress = false;

  constructor(private http: HttpClient) {
    this.initializeServiceUrls();
  }

  private initializeServiceUrls(): void {
    // Get current hostname to construct local service URLs
    const currentHost = window.location.hostname;
    const localIPs = this.getPossibleLocalIPs(currentHost);

    this.serviceUrls = [
      // Local service URLs (same network) - HIGHEST PRIORITY
      ...localIPs.map(ip => ({
        url: `http://${ip}:8000`,
        type: 'local' as const,
        isAvailable: false
      })),
      // Localhost fallback
      {
        url: 'http://localhost:8000',
        type: 'local' as const,
        isAvailable: false
      },
      // Common local network IPs for quick testing
      {
        url: 'http://192.168.1.100:8000',
        type: 'local' as const,
        isAvailable: false
      },
      {
        url: 'http://192.168.0.100:8000',
        type: 'local' as const,
        isAvailable: false
      },
      // Cloud service URLs (from environment)
      {
        url: environment.yoloServiceUrl || 'https://your-cloud-yolo-service.com',
        type: 'cloud' as const,
        isAvailable: false
      },
      // Supabase service URL
      {
        url: environment.supabaseUrl ? `${environment.supabaseUrl}/functions/v1/yolo-inference` : '',
        type: 'supabase' as const,
        isAvailable: false
      }
    ].filter(service => service.url); // Remove empty URLs
  }

  private getPossibleLocalIPs(currentHost: string): string[] {
    // Common local network IP ranges
    const commonRanges = [
      '192.168.1.',   // Common home router range
      '192.168.0.',   // Another common home router range
      '192.168.2.',   // Alternative range
      '10.0.0.',      // Corporate range
      '172.16.0.',    // Another corporate range
    ];

    const ips: string[] = [];

    // If we're already on a local IP, try variations of it
    if (this.isLocalIP(currentHost)) {
      const parts = currentHost.split('.');
      if (parts.length === 4) {
        // Try same subnet
        const base = parts.slice(0, 3).join('.');
        for (let i = 1; i <= 254; i++) {
          ips.push(`${base}.${i}`);
        }
      }
    } else {
      // Try common local network ranges
      commonRanges.forEach(range => {
        for (let i = 1; i <= 254; i++) {
          ips.push(`${range}${i}`);
        }
      });
    }

    // Remove duplicates and limit to reasonable number for performance
    return [...new Set(ips)].slice(0, 50); // Limit to 50 IPs to check
  }

  private isLocalIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;

    // Check for private IP ranges
    return (
      (parts[0] === 192 && parts[1] === 168) ||  // 192.168.x.x
      (parts[0] === 10) ||                        // 10.x.x.x
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || // 172.16-31.x.x
      (parts[0] === 127) ||                       // 127.x.x.x (localhost)
      parts[0] === 0 || parts[0] === 169         // Other local ranges
    );
  }

  /**
   * Detect available YOLO services and select the best one
   */
  async detectAndSelectService(): Promise<YOLOServiceInfo | null> {
    if (this.detectionInProgress) {
      return this.currentServiceSubject.value;
    }

    this.detectionInProgress = true;
    console.log('🔍 Detecting YOLO services...');

    try {
      const availableServices = await this.checkAllServices();
      
      if (availableServices.length === 0) {
        console.warn('⚠️ No YOLO services detected');
        this.currentServiceSubject.next(null);
        return null;
      }

      // Prioritize services: local > cloud > supabase
      const prioritizedServices = availableServices.sort((a, b) => {
        const priority = { local: 3, cloud: 2, supabase: 1 };
        const priorityA = priority[a.type] || 0;
        const priorityB = priority[b.type] || 0;
        
        // If same priority, prefer faster response times
        if (priorityA === priorityB) {
          return (a.responseTime || Infinity) - (b.responseTime || Infinity);
        }
        
        return priorityB - priorityA;
      });

      const selectedService = prioritizedServices[0];
      console.log(`✅ Selected YOLO service: ${selectedService.url} (${selectedService.type})`);
      
      this.currentServiceSubject.next(selectedService);
      return selectedService;

    } catch (error) {
      console.error('❌ Error detecting YOLO services:', error);
      return null;
    } finally {
      this.detectionInProgress = false;
    }
  }

  private async checkAllServices(): Promise<YOLOServiceInfo[]> {
    const checkPromises = this.serviceUrls.map(service => 
      this.checkServiceHealth(service).catch(error => {
        console.debug(`Service ${service.url} not available:`, error.message);
        return null;
      })
    );

    const results = await Promise.all(checkPromises);
    return results.filter(result => result !== null) as YOLOServiceInfo[];
  }

  private async checkServiceHealth(service: YOLOServiceInfo): Promise<YOLOServiceInfo> {
    const startTime = Date.now();
    
    try {
      const response = await this.http.get<any>(`${service.url}/health`)
        .pipe(timeout(3000), first())
        .toPromise();

      const responseTime = Date.now() - startTime;
      
      return {
        ...service,
        isAvailable: true,
        responseTime,
        modelLoaded: response?.model_loaded || false,
        serviceType: response?.service_type || 'unknown',
        ipAddress: response?.ip_address,
        port: response?.port,
        classes: response?.classes
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Service unavailable: ${errorMessage}`);
    }
  }

  /**
   * Get the current active YOLO service
   */
  getCurrentService(): YOLOServiceInfo | null {
    return this.currentServiceSubject.value;
  }

  /**
   * Manually set a specific service URL
   */
  setServiceUrl(url: string, type: 'local' | 'cloud' | 'supabase' = 'local'): void {
    const service: YOLOServiceInfo = {
      url,
      type,
      isAvailable: true
    };
    
    this.currentServiceSubject.next(service);
    console.log(`🔧 Manually set YOLO service: ${url} (${type})`);
  }

  /**
   * Reset service detection and re-detect
   */
  async resetAndDetect(): Promise<YOLOServiceInfo | null> {
    this.currentServiceSubject.next(null);
    return this.detectAndSelectService();
  }

  /**
   * Check if a specific service is available
   */
  async checkService(url: string): Promise<boolean> {
    try {
      await this.http.get(`${url}/health`)
        .pipe(timeout(3000), first())
        .toPromise();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats(): Observable<any> {
    const currentService = this.getCurrentService();
    if (!currentService) {
      return throwError('No service available');
    }

    return this.http.get(`${currentService.url}/health`).pipe(
      map(response => ({
        ...response,
        service_url: currentService.url,
        service_type: currentService.type,
        response_time: currentService.responseTime
      })),
      catchError(error => {
        console.error('Error getting service stats:', error);
        return throwError(error);
      })
    );
  }

  /**
   * Make a prediction request to the current service
   */
  predictFromFile(file: File | Blob, confidenceThreshold: number = 0.2, returnImage: boolean = false, filename: string = 'image.jpg'): Observable<any> {
    const currentService = this.getCurrentService();
    if (!currentService) {
      return throwError('No YOLO service available');
    }

    const formData = new FormData();
    // If it's a Blob, convert it to a File
    const fileToSend = file instanceof Blob ? new File([file], filename, { type: file.type || 'image/jpeg' }) : file;
    formData.append('file', fileToSend);
    formData.append('confidence_threshold', confidenceThreshold.toString());
    formData.append('return_image', returnImage.toString());

    return this.http.post(`${currentService.url}/predict`, formData).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Prediction error:', error);
        
        // If local service fails, try to fallback to cloud
        if (currentService.type === 'local' && error.status !== 200) {
          console.log('🔄 Local service failed, attempting cloud fallback...');
          return this.fallbackToCloud(fileToSend, confidenceThreshold, returnImage);
        }
        
        return throwError(error);
      })
    );
  }

  /**
   * Make a prediction request from base64 image
   */
  predictFromBase64(imageData: string, confidenceThreshold: number = 0.2, returnImage: boolean = false): Observable<any> {
    const currentService = this.getCurrentService();
    if (!currentService) {
      return throwError('No YOLO service available');
    }

    const payload = {
      image_data: imageData,
      confidence_threshold: confidenceThreshold,
      return_image: returnImage
    };

    return this.http.post(`${currentService.url}/predict-base64`, payload).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Base64 prediction error:', error);
        
        // If local service fails, try to fallback to cloud
        if (currentService.type === 'local' && error.status !== 200) {
          console.log('🔄 Local service failed, attempting cloud fallback...');
          return this.fallbackToCloudBase64(imageData, confidenceThreshold, returnImage);
        }
        
        return throwError(error);
      })
    );
  }

  private fallbackToCloud(file: File, confidenceThreshold: number, returnImage: boolean): Observable<any> {
    const cloudService = this.serviceUrls.find(s => s.type === 'cloud');
    if (!cloudService) {
      return throwError('No cloud service available for fallback');
    }

    console.log(`🔄 Falling back to cloud service: ${cloudService.url}`);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('confidence_threshold', confidenceThreshold.toString());
    formData.append('return_image', returnImage.toString());

    return this.http.post(`${cloudService.url}/predict`, formData).pipe(
      catchError(error => {
        console.error('Cloud service also failed:', error);
        return throwError(error);
      })
    );
  }

  private fallbackToCloudBase64(imageData: string, confidenceThreshold: number, returnImage: boolean): Observable<any> {
    const cloudService = this.serviceUrls.find(s => s.type === 'cloud');
    if (!cloudService) {
      return throwError('No cloud service available for fallback');
    }

    console.log(`🔄 Falling back to cloud service: ${cloudService.url}`);
    
    const payload = {
      image_data: imageData,
      confidence_threshold: confidenceThreshold,
      return_image: returnImage
    };

    return this.http.post(`${cloudService.url}/predict-base64`, payload).pipe(
      catchError(error => {
        console.error('Cloud service also failed:', error);
        return throwError(error);
      })
    );
  }
}
