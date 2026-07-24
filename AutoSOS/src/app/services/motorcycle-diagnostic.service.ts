import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

export interface MotorcycleDetection {
  class_id: number;
  class_name: string;
  display_name: string;
  confidence: number;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  center: {
    x: number;
    y: number;
  };
  severity: string;
  recommendation: string;
  estimatedCost: number;
}

export interface DiagnosticResult {
  success: boolean;
  detections: MotorcycleDetection[];
  count: number;
  diagnosis?: {
    issue: string;
    severity: string;
    recommendation: string;
    estimatedCost: number;
    description: string;
  };
}

export interface ModelInfo {
  modelName: string;
  version: string;
  inputSize: string;
  classes: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MotorcycleDiagnosticService {

  private isAndroid = Capacitor.getPlatform() === 'android';
  private isPluginAvailable = false;

  constructor() {
    this.checkPluginAvailability();
  }

  /**
   * Check if the native diagnostic plugin is available
   */
  private async checkPluginAvailability() {
    if (this.isAndroid) {
      try {
        // const { MotorcycleDiagnostic } = await import('@capacitor/core');
        // const result = await MotorcycleDiagnostic.isReady();
        // this.isPluginAvailable = result.ready;
        this.isPluginAvailable = false; // Plugin not available
        console.log('Motorcycle Diagnostic Plugin not available - using fallback');
      } catch (error) {
        console.warn('Motorcycle Diagnostic Plugin not available:', error);
        this.isPluginAvailable = false;
      }
    }
  }

  /**
   * Check if the diagnostic service is ready
   */
  async isReady(): Promise<boolean> {
    if (!this.isAndroid) {
      return false; // Only available on Android
    }

    try {
      // const { MotorcycleDiagnostic } = await import('@capacitor/core');
      // const result = await MotorcycleDiagnostic.isReady();
      // return result.ready;
      return false; // Plugin not available
    } catch (error) {
      console.error('Error checking diagnostic service readiness:', error);
      return false;
    }
  }

  /**
   * Analyze an image using the on-device YOLOv8 model
   */
  async analyzeImage(imageData: string): Promise<DiagnosticResult> {
    if (!this.isAndroid || !this.isPluginAvailable) {
      throw new Error('Diagnostic service not available on this platform');
    }

    try {
      // const { MotorcycleDiagnostic } = await import('@capacitor/core');
      
      console.log('🔍 Analyzing image with on-device YOLOv8...');
      // const result = await MotorcycleDiagnostic.analyzeImage({
      //   imageData: imageData
      // });
      
      // Fallback: return mock result since plugin is not available
      const result = {
        success: false,
        detections: [],
        count: 0,
        diagnosis: {
          issue: 'Plugin not available',
          severity: 'info',
          recommendation: 'Use web-based diagnostic instead',
          estimatedCost: 0,
          description: 'Motorcycle Diagnostic Plugin not available'
        }
      };

      console.log('✅ Analysis complete:', result);
      return result as DiagnosticResult;

    } catch (error) {
      console.error('❌ Image analysis failed:', error);
      throw new Error(`Analysis failed: ${error}`);
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(): Promise<ModelInfo> {
    if (!this.isAndroid || !this.isPluginAvailable) {
      throw new Error('Diagnostic service not available on this platform');
    }

    try {
      // const { MotorcycleDiagnostic } = await import('@capacitor/core');
      // const result = await MotorcycleDiagnostic.getModelInfo();
      // return result as ModelInfo;
      
      // Fallback: return mock model info since plugin is not available
      return {
        modelName: 'YOLOv8 (Fallback)',
        version: '1.0.0',
        inputSize: '640x640',
        classes: ['motorcycle', 'tire', 'engine', 'battery']
      } as ModelInfo;
    } catch (error) {
      console.error('Error getting model info:', error);
      throw error;
    }
  }

  /**
   * Test the diagnostic service
   */
  async testService(): Promise<boolean> {
    try {
      const ready = await this.isReady();
      if (!ready) {
        return false;
      }

      const modelInfo = await this.getModelInfo();
      console.log('Diagnostic Service Test:', modelInfo);
      return true;

    } catch (error) {
      console.error('Service test failed:', error);
      return false;
    }
  }

  /**
   * Get platform information
   */
  getPlatformInfo(): { platform: string; isAndroid: boolean; pluginAvailable: boolean } {
    return {
      platform: Capacitor.getPlatform(),
      isAndroid: this.isAndroid,
      pluginAvailable: this.isPluginAvailable
    };
  }

  /**
   * Format detection results for display
   */
  formatDetectionResults(detections: MotorcycleDetection[]): string {
    if (!detections || detections.length === 0) {
      return 'No issues detected in the motorcycle.';
    }

    if (detections.length === 1) {
      const det = detections[0];
      return `Detected ${det.display_name} with ${(det.confidence * 100).toFixed(1)}% confidence. ${det.severity} severity issue.`;
    }

    const issueNames = detections.map(d => d.display_name).join(', ');
    return `Detected ${detections.length} issues: ${issueNames}. Recommend immediate inspection.`;
  }

  /**
   * Get the most critical detection
   */
  getMostCriticalDetection(detections: MotorcycleDetection[]): MotorcycleDetection | null {
    if (!detections || detections.length === 0) {
      return null;
    }

    // Priority order: Critical > High > Medium > Low
    const severityPriority = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
    
    return detections.reduce((most, current) => {
      const mostPriority = severityPriority[most.severity as keyof typeof severityPriority] || 0;
      const currentPriority = severityPriority[current.severity as keyof typeof severityPriority] || 0;
      
      if (currentPriority > mostPriority) {
        return current;
      } else if (currentPriority === mostPriority && current.confidence > most.confidence) {
        return current;
      }
      return most;
    });
  }

  /**
   * Calculate total estimated cost
   */
  calculateTotalCost(detections: MotorcycleDetection[]): number {
    if (!detections || detections.length === 0) {
      return 0;
    }

    return detections.reduce((total, detection) => total + detection.estimatedCost, 0);
  }

  /**
   * Generate AR markers from detections (for real-time overlay)
   */
  generateARMarkers(detections: MotorcycleDetection[], videoWidth: number, videoHeight: number): Array<{x: number, y: number, label: string}> {
    if (!detections || detections.length === 0) {
      return [];
    }

    return detections.map(detection => {
      // Convert from absolute coordinates to percentage
      const centerX = (detection.center.x / videoWidth) * 100;
      const centerY = (detection.center.y / videoHeight) * 100;

      // Ensure markers stay within bounds
      const boundedX = Math.max(5, Math.min(95, centerX));
      const boundedY = Math.max(5, Math.min(95, centerY));

      return {
        x: boundedX,
        y: boundedY,
        label: `${detection.display_name} (${(detection.confidence * 100).toFixed(0)}%)`
      };
    });
  }
}
