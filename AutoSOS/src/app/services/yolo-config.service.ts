import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class YoloConfigService {
  
  // YOLOv8 Service Configuration
  private readonly YOLO_SERVICES = {
    // Primary service - Hugging Face Space
    primary: 'https://iceszn12-autosos.hf.space',
    
    // Fallback services
    fallbacks: [
      'https://autosos-yolo.onrender.com', // Render service
      'http://localhost:8002', // Local development
      'https://autosos-yolo-service.onrender.com' // Alternative Render URL
    ],
    
    // Service endpoints
    endpoints: {
      health: '/health',
      detect: '/detect',
      detectBase64: '/detect-base64',
      modelInfo: '/model-info'
    }
  };

  constructor() { }

  /**
   * Get the primary YOLO service URL
   */
  getPrimaryServiceUrl(): string {
    return this.YOLO_SERVICES.primary;
  }

  /**
   * Get all available service URLs (primary + fallbacks)
   */
  getAllServiceUrls(): string[] {
    return [this.YOLO_SERVICES.primary, ...this.YOLO_SERVICES.fallbacks];
  }

  /**
   * Get fallback service URLs
   */
  getFallbackUrls(): string[] {
    return this.YOLO_SERVICES.fallbacks;
  }

  /**
   * Get service endpoint URL
   */
  getEndpointUrl(serviceUrl: string, endpoint: keyof typeof this.YOLO_SERVICES.endpoints): string {
    return `${serviceUrl}${this.YOLO_SERVICES.endpoints[endpoint]}`;
  }

  /**
   * Get health check URL for a service
   */
  getHealthUrl(serviceUrl: string): string {
    return this.getEndpointUrl(serviceUrl, 'health');
  }

  /**
   * Get detection URL for a service
   */
  getDetectionUrl(serviceUrl: string): string {
    return this.getEndpointUrl(serviceUrl, 'detect');
  }

  /**
   * Get base64 detection URL for a service
   */
  getBase64DetectionUrl(serviceUrl: string): string {
    return this.getEndpointUrl(serviceUrl, 'detectBase64');
  }

  /**
   * Get model info URL for a service
   */
  getModelInfoUrl(serviceUrl: string): string {
    return this.getEndpointUrl(serviceUrl, 'modelInfo');
  }

  /**
   * Check if a URL is the primary Hugging Face service
   */
  isHuggingFaceService(url: string): boolean {
    return url.includes('hf.space') || url.includes('huggingface.co');
  }

  /**
   * Check if a URL is a local development service
   */
  isLocalService(url: string): boolean {
    return url.includes('localhost') || url.includes('127.0.0.1');
  }

  /**
   * Get service type description
   */
  getServiceType(url: string): string {
    if (this.isHuggingFaceService(url)) {
      return 'Hugging Face Space';
    } else if (this.isLocalService(url)) {
      return 'Local Development';
    } else if (url.includes('onrender.com')) {
      return 'Render Cloud Service';
    } else {
      return 'External Service';
    }
  }
}
