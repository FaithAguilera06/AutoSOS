import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface GradioPrediction {
  data: any[];
  is_generating: boolean;
  duration: number;
  average_duration: number;
}

export interface YOLODetection {
  class_id: number;
  class_name: string;
  class_display_name: string;
  confidence: number;
  bbox: number[]; // [x1, y1, x2, y2] format
  severity: string;
}

export interface YOLOResponse {
  success: boolean;
  detections: YOLODetection[];
  detection_count: number;
  image_size: {
    width: number;
    height: number;
  };
  confidence_threshold: number;
  annotated_image?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GradioYoloService {
  
  private readonly HF_SPACE_URL = 'https://iceszn12-autosos.hf.space';
  private readonly GRADIO_API_URL = `${this.HF_SPACE_URL}/api/predict`;
  
  constructor(private http: HttpClient) { }

  /**
   * Check if the Gradio space is accessible
   */
  async checkSpaceAccessibility(): Promise<boolean> {
    try {
      const response = await fetch(this.HF_SPACE_URL);
      return response.ok;
    } catch (error) {
      console.error('Gradio space accessibility check failed:', error);
      return false;
    }
  }

  /**
   * Detect motorcycle issues using Gradio API
   */
  async detectMotorcycleIssues(imageBlob: Blob, confidence: number = 0.5): Promise<YOLOResponse> {
    try {
      console.log('🔍 Using Gradio API for detection...');
      
      // Convert blob to base64
      const base64Image = await this.blobToBase64(imageBlob);
      
      // Prepare the request payload for Gradio
      const payload = {
        data: [
          `data:image/jpeg;base64,${base64Image}`,
          confidence
        ],
        fn_index: 0 // The first function in the Gradio interface
      };

      console.log('📤 Sending request to Gradio API:', this.GRADIO_API_URL);
      console.log('📦 Payload size:', JSON.stringify(payload).length);

      const response = await fetch(this.GRADIO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Gradio API request failed: ${response.status} ${response.statusText}`);
      }

      const result: GradioPrediction = await response.json();
      console.log('📥 Gradio API response:', result);

      // Parse the Gradio response
      return this.parseGradioResponse(result, imageBlob, confidence);

    } catch (error) {
      console.error('❌ Gradio detection failed:', error);
      return {
        success: false,
        detections: [],
        detection_count: 0,
        image_size: { width: 0, height: 0 },
        confidence_threshold: confidence,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Parse Gradio response into our standard format
   */
  private parseGradioResponse(
    gradioResponse: GradioPrediction, 
    originalImage: Blob, 
    confidence: number
  ): YOLOResponse {
    try {
      console.log('🔄 Parsing Gradio response...');
      
      if (!gradioResponse.data || gradioResponse.data.length === 0) {
        return {
          success: true,
          detections: [],
          detection_count: 0,
          image_size: { width: 0, height: 0 },
          confidence_threshold: confidence
        };
      }

      // Gradio returns [annotated_image, results_text]
      const [annotatedImageData, resultsText] = gradioResponse.data;
      
      console.log('📊 Results text from Gradio:', resultsText);
      
      // For now, we'll return a basic response
      // In a real implementation, you'd parse the results_text to extract detections
      return {
        success: true,
        detections: this.parseResultsText(resultsText),
        detection_count: this.parseResultsText(resultsText).length,
        image_size: { width: 640, height: 480 }, // Default size
        confidence_threshold: confidence,
        annotated_image: annotatedImageData
      };

    } catch (error) {
      console.error('❌ Failed to parse Gradio response:', error);
      return {
        success: false,
        detections: [],
        detection_count: 0,
        image_size: { width: 0, height: 0 },
        confidence_threshold: confidence,
        error: 'Failed to parse Gradio response'
      };
    }
  }

  /**
   * Parse results text from Gradio to extract detections
   */
  private parseResultsText(resultsText: string): YOLODetection[] {
    const detections: YOLODetection[] = [];
    
    try {
      // This is a simplified parser - you'd need to adjust based on your actual Gradio output format
      if (resultsText.includes('Issues Detected') && resultsText.includes('Issues Found')) {
        // Extract issue information from the text
        const issueMatches = resultsText.match(/\*\*(\d+)\.\s*([^*]+)\*\*/g);
        
        if (issueMatches) {
          issueMatches.forEach((match, index) => {
            const issueName = match.replace(/\*\*/g, '').replace(/^\d+\.\s*/, '');
            
            detections.push({
              class_id: index,
              class_name: issueName.toLowerCase().replace(/\s+/g, '_'),
              class_display_name: issueName,
              confidence: 0.8, // Default confidence
              bbox: [100 + index * 50, 100 + index * 50, 200 + index * 50, 150 + index * 50], // Default bbox
              severity: 'Medium'
            });
          });
        }
      }
    } catch (error) {
      console.error('Failed to parse results text:', error);
    }
    
    return detections;
  }

  /**
   * Convert blob to base64
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Fallback to Render service if Gradio fails
   */
  async detectWithFallback(imageBlob: Blob, confidence: number = 0.5): Promise<YOLOResponse> {
    try {
      // Try Gradio first
      const gradioResult = await this.detectMotorcycleIssues(imageBlob, confidence);
      
      if (gradioResult.success) {
        return gradioResult;
      }
      
      // Fallback to Render service
      console.log('🔄 Gradio failed, trying Render service...');
      return await this.detectWithRenderService(imageBlob, confidence);
      
    } catch (error) {
      console.error('❌ Both Gradio and fallback failed:', error);
      return {
        success: false,
        detections: [],
        detection_count: 0,
        image_size: { width: 0, height: 0 },
        confidence_threshold: confidence,
        error: 'All detection services failed'
      };
    }
  }

  /**
   * Fallback detection using Render service
   */
  private async detectWithRenderService(imageBlob: Blob, confidence: number): Promise<YOLOResponse> {
    try {
      const formData = new FormData();
      formData.append('file', imageBlob, 'frame.jpg');

      const response = await fetch('https://autosos-yolo.onrender.com/detect', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Render service failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Render service error: ${error}`);
    }
  }
}
