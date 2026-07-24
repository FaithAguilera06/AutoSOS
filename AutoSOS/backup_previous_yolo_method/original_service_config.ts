/**
 * Backup of Original YOLO Service Configuration
 * This file contains the original service configuration before implementing local YOLO hosting
 */

export class OriginalYOLOServiceConfig {
  // YOLOv8 service configuration
  private readonly YOLO_SERVICE_URL = 'https://iceszn12-autosos.hf.space'; // AutoSOS Hugging Face YOLOv8 Service
  private readonly GRADIO_API_URL = `${this.YOLO_SERVICE_URL}/api/predict`;
  
  // Alternative service URLs for testing
  private readonly ALTERNATIVE_URLS = [
    'https://iceszn12-autosos.hf.space', // Primary Hugging Face Space
    'https://autosos-yolo.onrender.com', // Render fallback
    'http://localhost:8002', // Local fallback
    'https://autosos-yolo-service.onrender.com' // Alternative URL
  ];

  // Original service health check method
  async checkYOLOServiceHealth(): Promise<boolean> {
    try {
      console.log('🏥 Checking YOLO service health...');
      
      // Try to access the service root first
      const healthResponse = await fetch(this.YOLO_SERVICE_URL, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (healthResponse.ok) {
        console.log('✅ YOLO service is accessible');
        return true;
      } else {
        console.log(`❌ YOLO service returned status: ${healthResponse.status}`);
        return false;
      }
    } catch (error) {
      console.error('❌ YOLO service health check failed:', error);
      return false;
    }
  }

  // Original Gradio space accessibility check
  async checkGradioSpaceAccessibility(): Promise<boolean> {
    try {
      const response = await fetch(this.YOLO_SERVICE_URL);
      return response.ok;
    } catch (error) {
      console.error('Gradio space accessibility check failed:', error);
      return false;
    }
  }

  // Original service testing methods
  async testServiceAccessibility(): Promise<void> {
    console.log('🏥 === SERVICE ACCESSIBILITY TEST ===');
    
    try {
      console.log('🏥 Testing service accessibility...');
      console.log('🏥 Service URL:', this.YOLO_SERVICE_URL);
      
      // Check if it's a Hugging Face Space (Gradio)
      if (this.YOLO_SERVICE_URL.includes('hf.space')) {
        console.log('🏥 Detected Hugging Face Space - testing main page...');
        
        // Test the main Gradio page instead of /health
        const response = await fetch(this.YOLO_SERVICE_URL);
        console.log('🏥 Gradio page response status:', response.status);
        console.log('🏥 Gradio page response ok:', response.ok);
        
        if (response.ok) {
          console.log('🏥 Hugging Face Space is accessible!');
        } else {
          console.log('🏥 Hugging Face Space is not accessible');
        }
        
      } else {
        // For other services, test the /health endpoint
        console.log('🏥 Testing health endpoint with Angular HTTP...');
        const httpResponse = await fetch(`${this.YOLO_SERVICE_URL}/health`);
        console.log('🏥 Health endpoint response:', httpResponse);
      }
      
    } catch (error) {
      console.error('🏥 Service accessibility test failed:', error);
    }
  }

  // Original connection diagnostics
  async runConnectionDiagnostics(): Promise<void> {
    console.log('🔍 === CONNECTION DIAGNOSTICS ===');
    
    try {
      // Test 1: Basic connectivity test
      console.log('Test 1: Testing basic connectivity...');
      const healthResponse = await fetch(`${this.YOLO_SERVICE_URL}/health`);
      console.log('✅ Health check successful:', healthResponse);
      
      // Test 2: Test with a simple GET request
      console.log('Test 2: Testing GET request...');
      const modelInfoResponse = await fetch(`${this.YOLO_SERVICE_URL}/model-info`);
      console.log('✅ Model info successful:', modelInfoResponse);
      
      // Test 3: Test with a minimal POST request
      console.log('Test 3: Testing minimal POST request...');
      const testResponse = await fetch(`${this.YOLO_SERVICE_URL}/detect-base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 pixel PNG
          confidence: 0.5,
          include_annotated_image: false
        })
      });
      console.log('✅ Minimal POST successful:', testResponse);
      
    } catch (error) {
      console.error('❌ Connection diagnostics failed:', error);
    }
  }

  // Original image analysis method
  async analyzeFrameWithYOLO(frameData: string, confidenceThreshold: number = 0.3): Promise<any> {
    try {
      console.log(`🔍 Sending frame to YOLOv8 service at ${this.YOLO_SERVICE_URL}/detect-base64 with confidence ${confidenceThreshold}`);
      
      const requestPayload = {
        image_data: frameData,
        confidence: confidenceThreshold,
        include_annotated_image: false
      };
      
      console.log('📤 Request payload:', {
        image_data_size: frameData.length,
        confidence: confidenceThreshold,
        include_annotated_image: false
      });
      
      const response = await fetch(`${this.YOLO_SERVICE_URL}/detect-base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('📥 Raw YOLO response:', response);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ YOLO analysis successful:', data);
        return data;
      } else {
        console.error('❌ YOLO analysis failed:', response.status, response.statusText);
        return null;
      }
      
    } catch (error) {
      console.error('❌ YOLO analysis error:', error);
      return null;
    }
  }

  // Original file upload method
  async testWithFileUpload(file: File): Promise<any> {
    try {
      console.log('📤 Testing with file upload...');
      
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('📤 Sending test image to YOLOv8 service...');
      const response = await fetch(`${this.YOLO_SERVICE_URL}/detect`, {
        method: 'POST',
        body: formData
      });
      
      console.log('📥 Test detection response:', response);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ File upload test successful:', data);
        return data;
      } else {
        console.error('❌ File upload test failed:', response.status);
        return null;
      }
      
    } catch (error) {
      console.error('❌ File upload test error:', error);
      return null;
    }
  }
}

// Export the original configuration
export const originalConfig = new OriginalYOLOServiceConfig();
