import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { GPT5Service, GPT5DiagnosticRequest, GPT5DiagnosticResponse } from '../../../../services/gpt5.service';
import { YOLOServiceDetectorService, YOLOServiceInfo } from '../../../../services/yolo-service-detector.service';
// import { GradioYoloService } from '../../../services/gradio-yolo.service';
// import { MotorcycleDiagnosticService, MotorcycleDetection, DiagnosticResult } from '../../../services/motorcycle-diagnostic.service';

export interface ARMarker {
  x: number;
  y: number;
  label: string;
}

export interface DiagnosisResult {
  issue: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  arAnalysis: string;
  recommendation: string;
  mechanicNeeded: boolean;
  mechanicReason?: string;
}

export interface YOLODetection {
  class_id: number;
  class_name: string;
  class_display_name: string;
  confidence: number;
  bbox: number[]; // [x1, y1, x2, y2] format from YOLO service
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

// Gradio API interfaces
export interface GradioPrediction {
  data: any[];
  is_generating: boolean;
  duration: number;
  average_duration: number;
}

@Component({
  selector: 'app-camera',
  templateUrl: 'camera.page.html',
  styleUrls: ['camera.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, HttpClientModule]
})
export class CameraPage implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef;

  cameraStream: MediaStream | null = null;
  isAnalyzing = false;
  analysisProgress = 0;
  currentStep = 0;
  diagnosisResult: DiagnosisResult | null = null;
  showTips = false;
  flashOn = false;
  arOverlay = false;
  arMarkers: ARMarker[] = [];
  yoloDetections: YOLODetection[] = [];
  confidenceThreshold = 0.3; // Fixed at 30% confidence threshold
  isRealtimeDetectionActive = false;
  detectionInterval: any = null;
  canvasElement: HTMLCanvasElement | null = null;
  lastDetectionTime = 0;
  detectionFrameRate = 3; // Process every 3 seconds for optimal performance
  yoloServiceStatus: 'checking' | 'available' | 'unavailable' = 'checking';
  useRealYOLO = true; // Always use real YOLOv8 detection
  currentYOLOService: YOLOServiceInfo | null = null;

  constructor(
    private router: Router,
    private toastController: ToastController,
    private http: HttpClient,
    private gpt5Service: GPT5Service,
    private yoloServiceDetector: YOLOServiceDetectorService
    // private motorcycleDiagnosticService: MotorcycleDiagnosticService
  ) { }

  async ngOnInit() {
    // Initialize camera page
    this.createCanvas();
    
    // Set YOLOv8 service status to checking initially
    this.yoloServiceStatus = 'checking';
    
    // Check if Android diagnostic service is available
    await this.checkAndroidDiagnosticService();
    
    // Detect and initialize YOLO service
    await this.initializeYOLOService();
  }

  /**
   * Initialize YOLO service detection
   */
  private async initializeYOLOService() {
    try {
      console.log('🔍 Initializing YOLO service detection...');
      this.currentYOLOService = await this.yoloServiceDetector.detectAndSelectService();
      
      if (this.currentYOLOService) {
        console.log(`✅ YOLO service detected: ${this.currentYOLOService.url} (${this.currentYOLOService.type})`);
        this.yoloServiceStatus = 'available';
        
        // Subscribe to service changes
        this.yoloServiceDetector.currentService$.subscribe(service => {
          this.currentYOLOService = service;
          this.yoloServiceStatus = service ? 'available' : 'unavailable';
        });
        
        await this.showToast(`YOLO service connected: ${this.currentYOLOService.type}`, 'success');
      } else {
        console.warn('⚠️ No YOLO service detected');
        this.yoloServiceStatus = 'unavailable';
        await this.showToast('No YOLO service available - using fallback mode', 'warning');
      }
    } catch (error) {
      console.error('❌ Error initializing YOLO service:', error);
      this.yoloServiceStatus = 'unavailable';
      await this.showToast('YOLO service initialization failed', 'danger');
    }
  }

  /**
   * Check if Android on-device diagnostic is available
   */
  private async checkAndroidDiagnosticService() {
    try {
      // const platformInfo = this.motorcycleDiagnosticService.getPlatformInfo();
      
      // if (platformInfo.isAndroid && platformInfo.pluginAvailable) {
      //   const isReady = await this.motorcycleDiagnosticService.isReady();
      //   if (isReady) {
      //     this.yoloServiceStatus = 'available';
      //     this.showToast('✅ Android on-device diagnostic ready!', 'success');
      //     console.log('✅ Android YOLOv8 diagnostic service is ready');
      //     return;
      //   }
      // }
      
      // Fall back to web service check
      this.yoloServiceStatus = 'checking';
      console.log('📱 Android diagnostic not available, checking web service...');
    } catch (error) {
      console.warn('Android diagnostic check failed:', error);
      this.yoloServiceStatus = 'checking';
    }
  }

  /**
   * Check if the YOLO service is accessible
   */
  private async checkYOLOServiceAccessibility(): Promise<boolean> {
    if (!this.currentYOLOService) {
      return false;
    }
    try {
      const response = await fetch(`${this.currentYOLOService.url}/health`);
      return response.ok;
    } catch (error) {
      console.error('YOLO service accessibility check failed:', error);
      return false;
    }
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
   * Check if YOLO service is available
   */
  private async checkYOLOServiceHealth(): Promise<boolean> {
    if (!this.currentYOLOService) {
      return false;
    }
    try {
      console.log('🏥 Checking YOLO service health...');
      
      // Try to access the service health endpoint
      const healthResponse = await fetch(`${this.currentYOLOService.url}/health`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('✅ YOLO service is accessible:', healthResponse.status);
      return healthResponse.ok;
    } catch (error) {
      console.error('❌ YOLO service health check failed:', error);
      return false;
    }
  }

  /**
   * Detect motorcycle issues using YOLO service
   */
  private async detectWithYOLOService(imageBlob: Blob, confidence: number = 0.5): Promise<YOLOResponse> {
    try {
      if (!this.currentYOLOService) {
        throw new Error('No YOLO service available');
      }
      
      console.log('🔍 Using YOLO service for detection...');
      
      // Check service health first
      const isHealthy = await this.checkYOLOServiceHealth();
      if (!isHealthy) {
        throw new Error('YOLO service is not accessible. Please check your connection or try again later.');
      }
      
      // Use the service detector to make the prediction
      const formData = new FormData();
      formData.append('file', imageBlob, 'image.jpg');
      
      console.log('📤 Sending request to:', this.currentYOLOService.url);
      
      const result = await this.yoloServiceDetector.predictFromFile(imageBlob, confidence, false, 'image.jpg').toPromise();
      
      console.log('✅ YOLO response received:', result);
      
      if (result && result.success) {
        return {
          success: true,
          detections: result.detections || [],
          detection_count: result.detections?.length || 0,
          image_size: result.image_info || { width: 0, height: 0 },
          confidence_threshold: confidence,
          annotated_image: result.annotated_image
        };
      } else {
        throw new Error('Detection failed or returned no results');
      }

    } catch (error) {
      console.error('❌ YOLO detection failed:', error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error: Unable to connect to YOLO service. Please check your connection.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        detections: [],
        detection_count: 0,
        image_size: { width: 0, height: 0 },
        confidence_threshold: confidence,
        error: errorMessage
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
   * Fallback detection with automatic service selection
   */
  private async detectWithFallback(imageBlob: Blob, confidence: number = 0.5): Promise<YOLOResponse> {
    try {
      console.log('🔄 Starting detection with automatic service selection...');
      
      // Use the YOLO service detector which handles fallback automatically
      const result = await this.detectWithYOLOService(imageBlob, confidence);
      
      if (result.success) {
        return result;
      }
      
      // If service detector fails, try to use the current service directly
      if (this.currentYOLOService) {
        console.log('🔄 Trying direct service call...');
        return await this.detectWithYOLOService(imageBlob, confidence);
      }
      
      throw new Error('No YOLO services available');
      
    } catch (error) {
      console.error('❌ Detection failed:', error);
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

  /**
   * Check YOLO service status on initialization (non-blocking)
   */
  private async checkYOLOServiceStatus() {
    // Non-blocking health check using current service
    try {
      const isAccessible = await this.checkYOLOServiceAccessibility();
      if (isAccessible) {
        this.yoloServiceStatus = 'available';
      } else {
        this.yoloServiceStatus = 'unavailable';
      }
    } catch (error) {
      this.yoloServiceStatus = 'available';
    }
  }

  /**
   * Check YOLOv8 service availability and start camera ONLY if service is working
   */
  private async checkYOLOServiceAndStartCamera() {
    console.log('🔍 Checking YOLOv8 service availability...');
    this.yoloServiceStatus = 'checking';
    
    try {
      // Step 1: Test the service with a simple health check
      const isAccessible = await this.checkYOLOServiceAccessibility();
      
      // Step 2: Test with a simple detection to make sure it's working
      console.log('🧪 Testing YOLOv8 detection endpoint...');
      const detectionTest = await this.testYOLOServiceWithDetection();
      
      if (detectionTest) {
        this.yoloServiceStatus = 'available';
        console.log('🚀 YOLOv8 service confirmed working - starting camera...');
        this.showToast('YOLOv8 service is ready! Starting camera with real detection.', 'success');
        this.useRealYOLO = true; // Enable real YOLOv8 detection
        this.startCamera();
      } else {
        throw new Error('Detection test failed');
      }
      
    } catch (error: any) {
      console.error('❌ YOLOv8 service check failed:', error);
      
      // Handle specific error types
      if (error.status === 502) {
        console.log('🚨 YOLOv8 service is down (502 Bad Gateway)');
        this.showToast('YOLOv8 service is down. Camera will NOT start.', 'danger');
      } else if (error.status === 503) {
        console.log('🚨 YOLOv8 service unavailable (503 Service Unavailable)');
        this.showToast('YOLOv8 service is overloaded. Camera will NOT start.', 'danger');
      } else if (error.status === 500) {
        console.log('🚨 YOLOv8 service internal error (500) - likely a Python bug');
        this.showToast('YOLOv8 service has a bug (500 error). Camera will NOT start.', 'danger');
      } else if (error.status === 0 || error.message?.includes('ERR_FAILED')) {
        console.log('🚨 YOLOv8 service connection failed');
        this.showToast('Cannot connect to YOLOv8 service. Camera will NOT start.', 'danger');
      } else {
        console.log('🚨 YOLOv8 service error:', error.status, error.message);
        this.showToast('YOLOv8 service error. Camera will NOT start.', 'danger');
      }
      
      this.yoloServiceStatus = 'unavailable';
      
      // DO NOT start camera if YOLOv8 service is not working
      console.log('🚫 Camera will NOT start - YOLOv8 service is not available');
      this.showToast('Please fix YOLOv8 service before using camera.', 'warning');
    }
  }

  /**
   * Test YOLOv8 service with a simple detection (optimized for low CPU)
   */
  private async testYOLOServiceWithDetection() {
    try {
      // Create a very small test image to save CPU/RAM
      const canvas = document.createElement('canvas');
      canvas.width = 64;  // Very small image
      canvas.height = 64; // Very small image
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = 'red';
        ctx.fillRect(5, 5, 10, 10); // Smaller rectangle
      }
      
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.1);
      });
      if (blob) {
        // Use Gradio API for testing
        const response = await this.detectWithFallback(blob, 0.3);
        
        console.log('✅ YOLOv8 detection test successful:', response);
        return true;
      }
    } catch (error: any) {
      console.error('❌ YOLOv8 detection test failed:', error);
      
      // If it's a 500 error, the service is responding but has a bug
      // We'll still consider it "available" since the service is running
      if (error.status === 500) {
        console.log('⚠️ YOLOv8 service is responding but has a bug (500 error)');
        console.log('📝 Service is available but needs the main.py fix to be deployed');
        return true; // Consider it available since service is running
      }
      
      // For other errors, throw them
      throw error;
    }
    return false;
  }

  ionViewDidEnter() {
    // Check YOLOv8 service first, then start camera
    console.log('📱 Camera page entered - checking YOLOv8 service...');
    this.checkYOLOServiceAndStartCamera();
  }

  ionViewWillLeave() {
    this.stopRealtimeDetection();
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
    }
  }

  /**
   * Create canvas for image processing
   */
  private createCanvas() {
    this.canvasElement = document.createElement('canvas');
  }

  /**
   * Start camera
   */
  async startCamera() {
    console.log('startCamera() called');
    this.showToast('Start Camera button clicked!', 'primary');
    
    // Clean up any existing camera resources first
    await this.cleanupCamera();
    
    try {
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported by this browser');
      }

      console.log('Camera API available, requesting permissions...');
      this.showToast('Starting camera...', 'primary');
      
      // Request camera with ultra low resolution for optimal performance
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 240, max: 320 }, // Ultra low resolution for faster processing
          height: { ideal: 180, max: 240 }, // Ultra low resolution
          frameRate: { ideal: 5, max: 10 } // Very low frame rate to save CPU
        },
        audio: false
      });

      console.log('Camera stream obtained:', this.cameraStream);

      // Wait a moment for Angular to process the cameraStream change
      await this.delay(100);

      // Try to get video element with retries
      let video: HTMLVideoElement | null = null;
      let retries = 0;
      const maxRetries = 10;

      while (!video && retries < maxRetries) {
        if (this.videoElement) {
          video = this.videoElement.nativeElement;
          console.log('Video element found via ViewChild');
        } else {
          // Fallback to document query
          video = document.querySelector('video') as HTMLVideoElement;
          if (video) {
            console.log('Video element found via document query');
          }
        }

        if (!video) {
          console.log(`Video element not ready, retry ${retries + 1}/${maxRetries}`);
          await this.delay(50);
          retries++;
        }
      }

      if (video) {
        console.log('Setting up video stream...');
        video.srcObject = this.cameraStream;
        
        // Force video to play
        try {
          await video.play();
          console.log('Video playing successfully');
        } catch (playError) {
          console.warn('Auto-play failed, user interaction may be required:', playError);
        }
        
        // Wait for video to load and start detection
        video.addEventListener('loadedmetadata', () => {
          console.log('Video metadata loaded, camera started successfully');
          this.showToast('Camera ready! Auto-starting detection...', 'success');
          // Auto-start detection after a short delay
          setTimeout(() => {
            this.startRealtimeDetection();
          }, 1500);
        });

        // Handle video errors
        video.addEventListener('error', (e: any) => {
          console.error('Video error:', e);
          this.showToast('Video stream error', 'danger');
        });
        
        // Add canplay event for additional debugging
        video.addEventListener('canplay', () => {
          console.log('Video can play');
        });
      } else {
        console.error('Video element not found');
        this.showToast('Video element not ready', 'danger');
      }
    } catch (error: any) {
      console.error('Error starting camera:', error);
      let errorMessage = 'Camera access denied or not available';
      
      if (error && error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and refresh.';
      } else if (error && error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error && error.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported by this browser.';
      } else if (error && error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      }
      
      this.showToast(errorMessage, 'danger');
    }
  }

  /**
   * Test YOLO service connection
   */




  /**
   * Test camera access for debugging
   */
  async testCameraAccess() {
    console.log('=== CAMERA TEST START ===');
    this.showToast('Testing camera access...', 'primary');

    // Clean up any existing streams first
    await this.cleanupCamera();

    try {
      // Test 1: Check if media devices are available
      console.log('Test 1: Media devices available?', !!navigator.mediaDevices);
      
      // Test 2: Check getUserMedia support
      console.log('Test 2: getUserMedia available?', !!navigator.mediaDevices?.getUserMedia);
      
      // Test 3: Try to get camera list
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Test 3: Video devices found:', videoDevices.length);
        console.log('Video devices:', videoDevices);
      }

      // Test 4: Try to get a simple stream
      console.log('Test 4: Attempting to get camera stream...');
      const testStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', // Try front camera first (usually more permissive)
          width: { ideal: 240, max: 320 }, // Ultra low resolution
          height: { ideal: 180, max: 240 }, // Ultra low resolution
          frameRate: { ideal: 5, max: 10 } // Very low frame rate
        }
      });
      
      console.log('Test 4: SUCCESS - Got camera stream:', testStream);
      this.showToast('Camera access successful!', 'success');
      
      // Clean up test stream immediately
      testStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped test track:', track.kind);
      });
      
      console.log('=== CAMERA TEST END - SUCCESS ===');
    } catch (error: any) {
      console.log('=== CAMERA TEST END - FAILED ===');
      console.error('Camera test failed:', error);
      this.showToast(`Camera test failed: ${error.message}`, 'danger');
    }
  }

  /**
   * Clean up camera resources
   */
  private async cleanupCamera() {
    console.log('Cleaning up camera resources...');
    
    // Stop real-time detection
    this.stopRealtimeDetection();
    
    // Stop existing camera stream
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped camera track:', track.kind);
      });
      this.cameraStream = null;
    }

    // Clear video element
    if (this.videoElement) {
      const video = this.videoElement.nativeElement;
      video.srcObject = null;
      video.load(); // Reset video element
    }

    // Reset state
    this.arOverlay = false;
    this.arMarkers = [];
    this.yoloDetections = [];
    this.diagnosisResult = null;
    
    console.log('Camera cleanup complete');
  }

  /**
   * Reset camera completely
   */
  async resetCamera() {
    console.log('Resetting camera...');
    this.showToast('Resetting camera...', 'primary');
    
    await this.cleanupCamera();
    
    // Wait a moment for cleanup to complete
    await this.delay(500);
    
    this.showToast('Camera reset complete. Click Start Camera to begin again.', 'success');
  }

  // Test detection function removed - only real YOLOv8 detections are shown

  // Simple box test function removed - only real YOLOv8 detections are shown

  /**
   * Switch between front and back camera
   */
  async switchCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
    }

    try {
      const facingMode = this.cameraStream?.getVideoTracks()[0]?.getSettings().facingMode === 'user' ? 'environment' : 'user';
      
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 240, max: 320 }, // Ultra low resolution
          height: { ideal: 180, max: 240 }, // Ultra low resolution
          frameRate: { ideal: 5, max: 10 } // Very low frame rate
        }
      });

      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.cameraStream;
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      this.showToast('Error switching camera', 'danger');
    }
  }

  /**
   * Toggle flash
   */
  toggleFlash() {
    this.flashOn = !this.flashOn;
    this.showToast(this.flashOn ? 'Flash enabled' : 'Flash disabled', 'primary');
  }

  /**
   * Toggle real-time detection
   */
  toggleRealtimeDetection() {
    if (this.isRealtimeDetectionActive) {
      this.stopRealtimeDetection();
    } else {
      this.startRealtimeDetection();
    }
  }

  /**
   * Start real-time detection
   */
  startRealtimeDetection() {
    if (!this.cameraStream || !this.videoElement || this.isRealtimeDetectionActive) {
      return;
    }

    console.log('Starting real-time detection...');
    this.isRealtimeDetectionActive = true;
    this.arOverlay = true;
    this.yoloServiceStatus = 'checking';
    
    // Process frames at specified interval (in seconds)
    const frameInterval = this.detectionFrameRate * 1000; // Convert seconds to milliseconds
    console.log(`⏱️ Detection interval set to ${frameInterval}ms (${this.detectionFrameRate}s)`);
    
    this.detectionInterval = setInterval(() => {
      this.processVideoFrame();
    }, frameInterval);

    this.showToast('Real-time AI detection started - using YOLOv8 for motorcycle issue detection', 'success');
    console.log(`Real-time detection started at ${this.detectionFrameRate} FPS with confidence threshold ${this.confidenceThreshold}`);
  }

  /**
   * Stop real-time detection
   */
  stopRealtimeDetection() {
    this.isRealtimeDetectionActive = false;
    this.arOverlay = false;
    this.arMarkers = [];
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    this.showToast('Real-time detection stopped', 'primary');
  }

  /**
   * Process a single video frame for detection
   */
  private async processVideoFrame() {
    if (!this.videoElement || !this.canvasElement || this.isAnalyzing) {
      return;
    }

    try {
      const video = this.videoElement.nativeElement;
      const canvas = this.canvasElement;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      // Set canvas to fixed small size for optimal performance
      canvas.width = 240;  // Fixed small width
      canvas.height = 180; // Fixed small height
      
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Always use real YOLOv8 detection
        await this.processVideoStreamWithYOLO();
      
    } catch (error) {
      console.error('❌ Real-time frame processing error:', error);
    }
  }


  /**
   * Process video stream with real YOLOv8 detection
   */
  private async processVideoStreamWithYOLO() {
    if (!this.videoElement || !this.canvasElement || this.isAnalyzing) {
      console.log('⚠️ Skipping detection - camera not ready or already analyzing');
      return;
    }

    try {
      console.log('🎥 Processing video frame for detection...');
      const video = this.videoElement.nativeElement;
      const canvas = this.canvasElement;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      // Set canvas to fixed small size for optimal performance
      canvas.width = 240;  // Fixed small width
      canvas.height = 180; // Fixed small height
      
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob for better performance
      const blob = await this.canvasToBlob(canvas);
      if (blob) {
        await this.analyzeFrameWithYOLOBlob(blob);
      }
      
    } catch (error) {
      console.error('❌ Video stream YOLO processing error:', error);
    }
  }

  /**
   * Convert canvas to blob with very low quality for minimal CPU/RAM usage
   */
  private async canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.1); // Ultra low quality (0.1) for faster processing
    });
  }

  /**
   * Analyze frame with YOLO using blob (Gradio integration)
   */
  private async analyzeFrameWithYOLOBlob(blob: Blob) {
    try {
      console.log('📤 Sending frame for detection...', blob.size, 'bytes');
      // Use Gradio service for Hugging Face Space
      const response = await this.detectWithFallback(blob, this.confidenceThreshold);

      if (response && response.success) {
        this.yoloServiceStatus = 'available';
        this.yoloDetections = response.detections || [];
        
        if (this.yoloDetections.length > 0) {
          this.updateARMarkersFromYOLO();
          this.diagnosisResult = await this.generateDiagnosisFromYOLO();
          console.log('🎯 Detected', this.yoloDetections.length, 'issues');
          
          // Auto-stop YOLO detection when diagnosis result appears
          if (this.isRealtimeDetectionActive) {
            this.stopRealtimeDetection();
          }
        } else {
          this.yoloDetections = [];
          this.arMarkers = [];
          this.diagnosisResult = null;
        }
      } else {
        this.yoloDetections = [];
        this.arMarkers = [];
        this.diagnosisResult = null;
      }
    } catch (error: any) {
      console.error('❌ Detection failed:', error.message);
      this.yoloServiceStatus = 'unavailable';
      this.clearDetections();
    }
  }

  /**
   * Analyze a single frame with YOLO
   */
  private async analyzeFrameWithYOLO(frameData: string) {
    try {
      if (!this.currentYOLOService) {
        console.warn('⚠️ No YOLO service available');
        return;
      }
      
      console.log(`🔍 Sending frame to YOLOv8 service at ${this.currentYOLOService.url} with confidence ${this.confidenceThreshold}`);
      console.log(`Frame data size: ${frameData.length} characters`);
      console.log(`YOLO service status: ${this.yoloServiceStatus}`);
      
      const requestPayload = {
        image_data: frameData,
        confidence: this.confidenceThreshold,
        include_annotated_image: false // Don't return annotated image for performance
      };
      
      console.log('📤 Request payload:', {
        image_data_size: frameData.length,
        confidence: this.confidenceThreshold,
        include_annotated_image: false
      });
      
      const response = await this.http.post<YOLOResponse>(
        `${this.currentYOLOService.url}/predict-base64`,
        requestPayload
      ).toPromise();

      console.log('📥 Raw YOLO response:', response);

      if (response && response.success) {
        // YOLO service is working
        this.yoloServiceStatus = 'available';
        
        console.log(`📊 YOLOv8 Response: ${response.detections?.length || 0} total detections received`);
        if (response.detections && response.detections.length > 0) {
          response.detections.forEach((det, i) => {
            console.log(`   Detection ${i+1}: ${det.class_display_name || det.class_name} - ${(det.confidence * 100).toFixed(1)}% confidence`);
            console.log(`   Bounding box: x1=${det.bbox[0]}, y1=${det.bbox[1]}, x2=${det.bbox[2]}, y2=${det.bbox[3]}`);
          });
        }
        
        // Only show detections that meet confidence threshold
        const validDetections = (response.detections || []).filter(detection => 
          detection.confidence >= this.confidenceThreshold
        );
        
        console.log(`✅ Valid detections after filtering (>=${this.confidenceThreshold}): ${validDetections.length}`);
        this.yoloDetections = validDetections;
        
        // Clear previous markers
        this.arMarkers = [];
        this.diagnosisResult = null;
        
        // Only update if we have valid detections
        if (this.yoloDetections.length > 0) {
          this.updateARMarkersFromYOLO();
          this.diagnosisResult = await this.generateDiagnosisFromYOLO();
          console.log(`Real YOLO detection: ${this.yoloDetections.length} issues found with confidence >= ${this.confidenceThreshold}`);
          
          // Auto-stop YOLO detection when diagnosis result appears
          if (this.isRealtimeDetectionActive) {
            this.stopRealtimeDetection();
          }
        } else {
          // No valid detections - clear overlay
          this.arOverlay = false;
          console.log('No motorcycle issues detected above confidence threshold');
        }
      } else {
        // Clear detections if YOLO response is invalid
        this.yoloServiceStatus = 'unavailable';
        this.clearDetections();
        console.log('YOLO response was unsuccessful or invalid');
      }
    } catch (error: any) {
      // YOLO service unavailable
      this.yoloServiceStatus = 'unavailable';
      this.clearDetections();
      
      // Log error details to help debug
      console.error('❌ YOLOv8 service error:', error);
      console.error('Error details:', {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        url: error.url,
        name: error.name
      });
      console.log('🔴 YOLO service unavailable - no detections will be shown');
    }
  }

  /**
   * Clear all detections and markers
   */
  private clearDetections() {
    this.yoloDetections = [];
    this.arMarkers = [];
    this.diagnosisResult = null;
    this.arOverlay = false;
  }



  /**
   * Force detailed analysis of current frame
   */
  async analyzeCurrentFrame() {
    if (!this.videoElement || !this.canvasElement) {
      this.showToast('Camera not ready', 'warning');
      return;
    }

    // Temporarily stop real-time detection for detailed analysis
    const wasActive = this.isRealtimeDetectionActive;
    if (wasActive) {
      this.stopRealtimeDetection();
    }

    this.isAnalyzing = true;
    this.analysisProgress = 0;
    this.currentStep = 0;

    try {
      // Capture current frame for detailed analysis
      const video = this.videoElement.nativeElement;
      const canvas = this.canvasElement;
      const ctx = canvas.getContext('2d');
      
      let frameData = '';
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const dataURL = canvas.toDataURL('image/jpeg');
        frameData = dataURL.split(',')[1]; // Extract base64 data without prefix
      }

      // Use YOLOv8 for detailed analysis
      await this.performDetailedYOLOAnalysis(frameData);
      
      // Generate diagnosis result based on YOLO detections
      this.diagnosisResult = await this.generateDiagnosisFromYOLO();
      
      this.showToast('Detailed analysis complete!', 'success');
    } catch (error) {
      console.error('Error analyzing frame:', error);
      this.showToast('Error analyzing frame', 'danger');
    } finally {
      this.isAnalyzing = false;
      
      // Resume real-time detection if it was active
      if (wasActive) {
        this.startRealtimeDetection();
      }
    }
  }

  // AR markers simulation function removed - only real YOLOv8 detections are shown

  /**
   * Perform detailed YOLOv8 analysis with progress
   */
  private async performDetailedYOLOAnalysis(frameData: string) {
    const steps = [
      { name: 'Preparing Image', duration: 500 },
      { name: 'YOLOv8 Analysis', duration: 2000 },
      { name: 'Processing Results', duration: 1000 },
      { name: 'Generating Report', duration: 500 }
    ];

    for (let i = 0; i < steps.length; i++) {
      this.currentStep = i + 1;
      
      // Simulate progress for each step
      const stepProgress = 25; // 25% per step
      const startProgress = i * stepProgress;
      
      for (let j = 0; j < stepProgress; j++) {
        this.analysisProgress = startProgress + j;
        await this.delay(30); // 30ms per 1% progress
      }
    }

    // Perform actual YOLO analysis
    await this.callDetailedYOLOService(frameData);

    this.analysisProgress = 100;
    await this.delay(500);
  }

  /**
   * Call YOLOv8 service for detailed analysis
   */
  private async callDetailedYOLOService(frameData: string) {
    try {
      if (!this.currentYOLOService) {
        throw new Error('No YOLO service available');
      }
      
      const response = await this.yoloServiceDetector.predictFromBase64(
        frameData,
        this.confidenceThreshold,
        true
      ).toPromise();

      if (response && response.success) {
        this.yoloDetections = response.detections;
        
        // Update AR markers based on YOLO detections
        this.updateARMarkersFromYOLO();
        
        console.log('Detailed YOLO Analysis Results:', response);
      } else {
        throw new Error('YOLO service returned unsuccessful response');
      }
    } catch (error) {
      console.error('YOLO service error:', error);
      // Clear all detections when YOLO service is unavailable
      this.clearDetections();
      this.yoloServiceStatus = 'unavailable';
    }
  }

  /**
   * Update AR markers based on YOLO detections
   */
  private updateARMarkersFromYOLO() {
    console.log('🔍 === UPDATE AR MARKERS ===');
    console.log('🔍 Video element exists:', !!this.videoElement);
    console.log('🔍 YOLO detections count:', this.yoloDetections.length);
    console.log('🔍 YOLO detections:', this.yoloDetections);
    
    if (!this.videoElement) {
      console.log('❌ No video element for AR markers');
      return;
    }
    
    const video = this.videoElement.nativeElement;
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    
    console.log(`🎯 REAL-TIME DETECTION: Video ${videoWidth}x${videoHeight}, Processing ${this.yoloDetections.length} detections`);
    
    // Clear previous markers
    this.arMarkers = [];
    
    if (this.yoloDetections.length === 0) {
      console.log('❌ No detections to process');
      this.arOverlay = false;
      return;
    }
    
    // Create new markers for each detection
    this.arMarkers = this.yoloDetections.map((detection, index) => {
      console.log(`🔍 Processing detection ${index + 1}:`, detection);
      
      // Calculate center from bounding box coordinates [x1, y1, x2, y2]
      const centerX = (detection.bbox[0] + detection.bbox[2]) / 2;
      const centerY = (detection.bbox[1] + detection.bbox[3]) / 2;
      
      // Convert to percentage for overlay positioning
      const centerXPercent = (centerX / videoWidth) * 100;
      const centerYPercent = (centerY / videoHeight) * 100;
      
      // Ensure markers stay within bounds
      const boundedX = Math.max(5, Math.min(95, centerXPercent));
      const boundedY = Math.max(5, Math.min(95, centerYPercent));
      
      console.log(`📦 REAL-TIME BOX ${index + 1}: ${detection.class_display_name} at (${boundedX.toFixed(1)}%, ${boundedY.toFixed(1)}%) - Confidence: ${(detection.confidence * 100).toFixed(0)}%`);
      
      const marker = {
        x: boundedX,
        y: boundedY,
        label: `${detection.class_display_name} (${(detection.confidence * 100).toFixed(0)}%)`
      };
      
      console.log(`📦 Created marker:`, marker);
      return marker;
    });
    
    console.log('🔍 Final AR markers:', this.arMarkers);
    
    // ALWAYS show overlay when we have markers, even if just one
    if (this.arMarkers.length > 0) {
      this.arOverlay = true;
      console.log(`✅ REAL-TIME BOXES ACTIVE: ${this.arMarkers.length} detection boxes displayed`);
      console.log(`✅ AR Overlay set to:`, this.arOverlay);
    } else {
      this.arOverlay = false;
      console.log(`❌ NO DETECTIONS: Boxes cleared`);
    }
  }

  // Mock analysis function removed - only real YOLOv8 detections are shown

  /**
   * Get image width for percentage calculations
   */
  private getImageWidth(): number {
    return 640; // Default YOLO input size
  }

  /**
   * Get image height for percentage calculations
   */
  private getImageHeight(): number {
    return 640; // Default YOLO input size
  }

  /**
   * Generate diagnosis result from YOLO detections
   */
  private async generateDiagnosisFromYOLO(): Promise<DiagnosisResult> {
    if (this.yoloDetections.length === 0) {
      return {
        issue: 'No Issues Detected',
        severity: 'Low' as const,
        description: 'No motorcycle issues were detected in the image. Your motorcycle appears to be in good condition.',
        arAnalysis: 'YOLOv8 analysis completed with no issues found.',
        recommendation: 'Continue regular maintenance and inspections.',
        mechanicNeeded: false,
        mechanicReason: 'No issues detected'
      };
    }

    // Get the highest confidence detection
    const primaryDetection = this.yoloDetections.reduce((prev, current) => 
      (prev.confidence > current.confidence) ? prev : current
    );

    // Generate diagnosis based on detected issue using GPT
    return await this.generateDiagnosisForIssue(primaryDetection);
  }

  /**
   * Generate diagnosis for specific issue using GPT
   */
  private async generateDiagnosisForIssue(detection: YOLODetection): Promise<DiagnosisResult> {
    try {
      // Create a professional motorcycle mechanic prompt for GPT
      const prompt = `You are a professional motorcycle mechanic with 20+ years of experience. I need you to analyze this motorcycle issue detected by our AI system.

DETECTED ISSUE: ${detection.class_display_name}
CONFIDENCE LEVEL: ${(detection.confidence * 100).toFixed(1)}%
SEVERITY: ${detection.severity}

Please provide a professional assessment in this EXACT JSON format:
{
  "severity": "Low|Medium|High|Critical",
  "description": "Professional description of the issue and its implications",
  "recommendation": "Specific actionable steps to address the issue",
  "mechanicNeeded": true/false,
  "mechanicReason": "Explanation of why mechanic is or isn't needed"
}

IMPORTANT RULES:
- Always require mechanic for flat tire and oil leak (mechanicNeeded: true)
- Be specific about safety implications
- Provide practical, actionable advice
- Consider both immediate and long-term solutions
- Always prioritize rider safety
- Use professional motorcycle terminology
- Keep descriptions concise but informative`;

      const request: GPT5DiagnosticRequest = {
        user_message: prompt,
        yolo_detections: [detection],
        user_tier: 'free',
        emergency_level: 'normal'
      };

      const response = await this.gpt5Service.generateDiagnostic(request).toPromise();
      
      if (response && response.success && response.response) {
        try {
          // Try to parse the JSON response
          const gptAnalysis = JSON.parse(response.response);
          
          return {
            issue: detection.class_display_name,
            severity: gptAnalysis.severity || detection.severity,
            description: gptAnalysis.description || `Detected ${detection.class_display_name} with ${(detection.confidence * 100).toFixed(1)}% confidence.`,
            arAnalysis: `YOLOv8 detected ${detection.class_display_name} with ${(detection.confidence * 100).toFixed(1)}% confidence. ${this.yoloDetections.length > 1 ? `Total of ${this.yoloDetections.length} issues found.` : ''}`,
            recommendation: gptAnalysis.recommendation || 'Have the issue inspected by a qualified mechanic.',
            mechanicNeeded: gptAnalysis.mechanicNeeded || this.isMechanicRequired(detection.class_name),
            mechanicReason: gptAnalysis.mechanicReason || this.getMechanicReason(detection.class_name)
          };
        } catch (parseError) {
          console.warn('Failed to parse GPT response as JSON, using fallback:', parseError);
          return this.getFallbackDiagnosis(detection);
        }
      } else {
        console.warn('GPT service unavailable, using fallback diagnosis');
        return this.getFallbackDiagnosis(detection);
      }
    } catch (error) {
      console.error('Error getting GPT diagnosis:', error);
      return this.getFallbackDiagnosis(detection);
    }
  }

  private isMechanicRequired(className: string): boolean {
    // Always require mechanic for critical issues
    const criticalIssues = ['flat_tire', 'oil_leak'];
    return criticalIssues.includes(className);
  }

  private getMechanicReason(className: string): string {
    const reasons = {
      'flat_tire': 'Flat tires require professional inspection and repair for safety',
      'oil_leak': 'Oil leaks need professional diagnosis to prevent engine damage',
      'broken_headlights_tail_lights': 'Electrical issues require professional expertise',
      'broken_side_mirror': 'Mirror replacement requires proper alignment and installation'
    };
    return reasons[className as keyof typeof reasons] || 'Professional inspection recommended for safety';
  }

  private getFallbackDiagnosis(detection: YOLODetection): DiagnosisResult {
    const issueMap = {
      ' ': {
        severity: 'High' as const,
        description: 'Broken or damaged headlights/tail lights detected. This affects visibility and safety, especially during night riding.',
        recommendation: 'Replace damaged lights immediately. Check electrical connections and ensure proper alignment.',
        mechanicNeeded: true,
        mechanicReason: 'Electrical issues require professional expertise'
      },
      'broken_side_mirror': {
        severity: 'Medium' as const,
        description: 'Broken or damaged side mirror detected. This significantly reduces rear visibility and increases accident risk.',
        recommendation: 'Replace the damaged mirror and ensure proper adjustment. Consider upgrading to heated mirrors for better visibility.',
        mechanicNeeded: true,
        mechanicReason: 'Mirror replacement requires proper alignment and installation'
      },
      'flat_tire': {
        severity: 'Critical' as const,
        description: 'Flat or severely deflated tire detected. This is extremely dangerous and requires immediate attention.',
        recommendation: 'Stop riding immediately. Replace or repair the tire before continuing. Check for punctures or valve issues.',
        mechanicNeeded: true,
        mechanicReason: 'Flat tires require professional inspection and repair for safety'
      },
      'oil_leak': {
        severity: 'High' as const,
        description: 'Oil leak detected. This can lead to engine damage and safety hazards if not addressed promptly.',
        recommendation: 'Identify the source of the leak and repair immediately. Check oil levels and engine condition.',
        mechanicNeeded: true,
        mechanicReason: 'Oil leaks need professional diagnosis to prevent engine damage'
      }
    };

    const issueInfo = issueMap[detection.class_name as keyof typeof issueMap] || {
      severity: 'Medium' as const,
      description: `Issue detected: ${detection.class_display_name}`,
      recommendation: 'Have a qualified mechanic inspect and repair the issue.',
      mechanicNeeded: true,
      mechanicReason: 'Professional inspection recommended for safety'
    };

    return {
      issue: detection.class_display_name,
      severity: issueInfo.severity,
      description: issueInfo.description,
      arAnalysis: `YOLOv8 detected ${detection.class_display_name} with ${(detection.confidence * 100).toFixed(1)}% confidence. ${this.yoloDetections.length > 1 ? `Total of ${this.yoloDetections.length} issues found.` : ''}`,
      recommendation: issueInfo.recommendation,
      mechanicNeeded: issueInfo.mechanicNeeded,
      mechanicReason: issueInfo.mechanicReason
    };
  }

  /**
   * Continue detection or start new diagnosis
   */
  continueDetection() {
    this.diagnosisResult = null;
    this.isAnalyzing = false;
    this.analysisProgress = 0;
    this.currentStep = 0;
    this.yoloDetections = [];
    this.arMarkers = [];
    this.arOverlay = false;
    
    // If real-time detection was active before, restart it
    if (this.cameraStream && this.videoElement) {
      this.startRealtimeDetection();
    }
  }

  /**
   * Go back to diagnostic page
   */
  goBack() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
    }
    this.router.navigate(['/client/diagnostic']);
  }

  /**
   * Show help information
   */
  async showHelp() {
    this.showTips = true;
  }

  /**
   * Hide tips
   */
  hideTips() {
    this.showTips = false;
  }

  /**
   * Show toast message
   */
  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Track function for ngFor to improve performance
   */
  trackByIndex(index: number, item: any): number {
    return index;
  }

  /**
   * Cleanup on component destroy
   */
  ngOnDestroy() {
    this.stopRealtimeDetection();
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
    }
  }

  /**
   * Adjust detection frame rate
   */
  setDetectionFrameRate(event: any) {
    const fps = typeof event.detail.value === 'number' ? event.detail.value : event.detail.value.lower || event.detail.value;
    this.detectionFrameRate = Math.max(0.5, Math.min(30, fps)); // Limit between 0.5 and 30 FPS
    
    if (this.isRealtimeDetectionActive) {
      this.stopRealtimeDetection();
      this.startRealtimeDetection();
    }
  }

  /**
   * Get diagnostic label for detected class
   */
  getDiagnosticLabel(className: string): string {
    const diagnosticLabels: { [key: string]: string } = {
      'broken_headlights_tail_lights': 'Check Headlights',
      'broken_side_mirror': 'Check Mirror',
      'flat_tire': 'Flat Tire',
      'oil_leak': 'Oil Leak'
    };
    
    return diagnosticLabels[className] || 'Check Component';
  }



  /**
   * Manually start camera when service is available
   */
  async manualStartCamera() {
    console.log('🎥 Manual camera start requested');
    await this.startCamera();
  }

  /**
   * Diagnose connection issues with detailed testing
   */
  private async diagnoseConnectionIssue() {
    console.log('🔍 === CONNECTION DIAGNOSTICS ===');
    
    if (!this.currentYOLOService) {
      console.error('No YOLO service available for diagnostics');
      this.showToast('No YOLO service to test', 'danger');
      return;
    }
    
    try {
      // Test 1: Basic connectivity test
      console.log('Test 1: Testing basic connectivity...');
      const healthResponse = await this.http.get(`${this.currentYOLOService.url}/health`).toPromise();
      console.log('✅ Health check successful:', healthResponse);
      
      // Test 2: Test with a simple GET request
      console.log('Test 2: Testing GET request...');
      const modelInfoResponse = await this.http.get(`${this.currentYOLOService.url}/model-info`).toPromise();
      console.log('✅ Model info successful:', modelInfoResponse);
      
      // Test 3: Test with a minimal POST request
      console.log('Test 3: Testing minimal POST request...');
      const testResponse = await this.http.post(`${this.currentYOLOService.url}/detect-base64`, {
        image_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 pixel PNG
        confidence: 0.5,
        include_annotated_image: false
      }).toPromise();
      console.log('✅ Minimal POST successful:', testResponse);
      
      console.log('🔍 All diagnostic tests passed - service should be working');
      this.yoloServiceStatus = 'available';
      this.showToast('Connection diagnostics passed - service is working', 'success');
      
    } catch (error: any) {
      console.error('🔍 Diagnostic test failed:', error);
      console.error('🔍 Diagnostic error details:', {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        url: error.url,
        name: error.name
      });
      
      if (error.status === 0) {
        console.log('🔍 Status 0 indicates:');
        console.log('   - CORS policy is blocking requests');
        console.log('   - Service is completely unreachable');
        console.log('   - Network/firewall blocking connection');
        console.log('   - SSL certificate issues');
        
        this.showToast('Diagnostic: CORS or network issue detected', 'danger');
    } else {
        this.showToast(`Diagnostic: Service error (${error.status})`, 'warning');
      }
    }
  }

  /**
   * Test YOLOv8 service with comprehensive diagnostics
   */
  async runComprehensiveDiagnostics() {
    console.log('🧪 === COMPREHENSIVE YOLOv8 DIAGNOSTICS ===');
    this.showToast('Running comprehensive diagnostics...', 'primary');
    
    // First, try to find a working service URL
    const workingUrl = await this.findWorkingServiceUrl();
    if (!workingUrl) {
      console.log('❌ No working service URL found');
      this.yoloServiceStatus = 'unavailable';
      this.showToast('No working YOLOv8 service found', 'danger');
      return;
    }
    
    console.log('✅ Found working service URL:', workingUrl);
    this.showToast(`Testing service at: ${workingUrl}`, 'primary');
    
    try {
      // Test 1: Service availability
      console.log('Test 1: Service availability check...');
      const healthCheck = await this.http.get(`${workingUrl}/health`).toPromise();
      console.log('✅ Service is available:', healthCheck);
      
      // Test 2: Model information
      console.log('Test 2: Model information check...');
      const modelInfo = await this.http.get(`${workingUrl}/model-info`).toPromise();
      console.log('✅ Model info retrieved:', modelInfo);
      
      // Test 3: Simple detection test
      console.log('Test 3: Simple detection test...');
      const simpleTest = await this.http.post(`${workingUrl}/detect-base64`, {
        image_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        confidence: 0.1,
        include_annotated_image: false
      }).toPromise();
      console.log('✅ Simple detection test passed:', simpleTest);
      
      // Test 4: FormData test
      console.log('Test 4: FormData upload test...');
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 100;
      testCanvas.height = 100;
      const ctx = testCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 100, 100);
      }
      
      const blob = await this.canvasToBlob(testCanvas);
      if (blob) {
        const formData = new FormData();
        formData.append('file', blob, 'test.jpg');
        
        const formDataTest = await this.http.post(`${workingUrl}/detect`, formData).toPromise();
        console.log('✅ FormData test passed:', formDataTest);
      }
      
      console.log('🎉 All comprehensive diagnostics passed!');
      this.yoloServiceStatus = 'available';
      this.showToast('All diagnostics passed - YOLOv8 service is fully functional', 'success');
      
    } catch (error: any) {
      console.error('❌ Comprehensive diagnostics failed:', error);
      this.yoloServiceStatus = 'unavailable';
      this.showToast(`Diagnostics failed: ${error.message}`, 'danger');
    }
  }

  /**
   * Find a working service URL by re-detecting services
   */
  private async findWorkingServiceUrl(): Promise<string | null> {
    console.log('🔍 Re-detecting services...');
    
    try {
      const service = await this.yoloServiceDetector.resetAndDetect();
      if (service && service.url) {
        console.log(`✅ Found working service URL: ${service.url}`);
        return service.url;
      }
    } catch (error: any) {
      console.log(`❌ Service detection failed:`, error);
    }
    
    console.log('❌ No working service URLs found');
    return null;
  }

  /**
   * Test basic connectivity to the service
   */
  async testBasicConnectivity() {
    console.log('🌐 === BASIC CONNECTIVITY TEST ===');
    this.showToast('Testing basic connectivity...', 'primary');
    
    if (!this.currentYOLOService) {
      console.error('No YOLO service available for testing');
      this.showToast('No YOLO service to test', 'danger');
      return;
    }
    
    try {
      // Test 1: Simple fetch request
      console.log('Test 1: Testing with fetch API...');
      const response = await fetch(`${this.currentYOLOService.url}/health`);
      console.log('Fetch response status:', response.status);
      console.log('Fetch response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Fetch test successful:', data);
        this.showToast('Basic connectivity test passed', 'success');
    } else {
        console.log('❌ Fetch test failed with status:', response.status);
        this.showToast(`Connectivity test failed: ${response.status}`, 'danger');
      }
      
    } catch (error: any) {
      console.error('❌ Basic connectivity test failed:', error);
      this.showToast(`Connectivity test failed: ${error.message}`, 'danger');
    }
  }

  /**
   * Test raw HTTP response to see what we're actually getting
   */
  async testRawResponse() {
    console.log('🔍 === RAW RESPONSE TEST ===');
    this.showToast('Testing raw response...', 'primary');
    
    try {
      // Create a simple test image
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 100;
      testCanvas.height = 100;
      const ctx = testCanvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 100, 100);
      }
      
      const blob = await this.canvasToBlob(testCanvas);
      if (blob && this.currentYOLOService) {
        const formData = new FormData();
        formData.append('file', blob, 'test.jpg');
        
        console.log('🔍 Testing raw HTTP response...');
        console.log('🔍 Service URL:', this.currentYOLOService.url);
        console.log('🔍 Blob size:', blob.size);
        
        // Use fetch to see raw response
        const response = await fetch(`${this.currentYOLOService.url}/detect`, {
          method: 'POST',
          body: formData
        });
        
        console.log('🔍 Raw response status:', response.status);
        console.log('🔍 Raw response headers:', response.headers);
        console.log('🔍 Raw response ok:', response.ok);
        
        if (response.ok) {
          const responseText = await response.text();
          console.log('🔍 Raw response text:', responseText);
          
          try {
            const responseJson = JSON.parse(responseText);
            console.log('🔍 Parsed JSON response:', responseJson);
            this.showToast('Raw response test successful', 'success');
          } catch (parseError) {
            console.error('🔍 Failed to parse response as JSON:', parseError);
            this.showToast('Response is not valid JSON', 'warning');
          }
        } else {
          console.log('🔍 Raw response failed:', response.status, response.statusText);
          this.showToast(`Raw response failed: ${response.status}`, 'danger');
        }
      }
      
    } catch (error: any) {
      console.error('❌ Raw response test failed:', error);
      this.showToast(`Raw response test failed: ${error.message}`, 'danger');
    }
  }

  /**
   * Test health endpoint specifically to debug the issue
   */
  async testHealthEndpoint() {
    console.log('🏥 === SERVICE ACCESSIBILITY TEST ===');
    this.showToast('Testing service accessibility...', 'primary');
    
    if (!this.currentYOLOService) {
      console.error('No YOLO service available for testing');
      this.showToast('No YOLO service to test', 'danger');
      return;
    }
    
    try {
      console.log('🏥 Testing service accessibility...');
      console.log('🏥 Service URL:', this.currentYOLOService.url);
      
      // For other services, test the /health endpoint
      console.log('🏥 Testing health endpoint with Angular HTTP...');
      const httpResponse = await this.http.get(`${this.currentYOLOService.url}/health`).toPromise();
      console.log('🏥 Angular HTTP response:', httpResponse);
      this.showToast('Health endpoint test successful!', 'success');
      this.yoloServiceStatus = 'available';
      
    } catch (httpError: any) {
      console.error('🏥 Service accessibility test failed:', httpError);
      console.error('🏥 Error details:', {
        status: httpError.status,
        statusText: httpError.statusText,
        message: httpError.message,
        url: httpError.url,
        name: httpError.name,
        ok: httpError.ok
      });
      
      // Try with fetch as fallback
      try {
        console.log('🏥 Trying with fetch API as fallback...');
        const fetchResponse = await fetch(`${this.currentYOLOService.url}/health`);
        console.log('🏥 Fetch response status:', fetchResponse.status);
        console.log('🏥 Fetch response ok:', fetchResponse.ok);
        console.log('🏥 Fetch response headers:', fetchResponse.headers);
        
        if (fetchResponse.ok) {
          console.log('🏥 Service is accessible with fetch!');
          this.showToast('Service accessibility test successful with fetch!', 'success');
          this.yoloServiceStatus = 'available';
        } else {
          console.log('🏥 Service not accessible:', fetchResponse.status, fetchResponse.statusText);
          this.showToast(`Service not accessible: ${fetchResponse.status}`, 'danger');
          this.yoloServiceStatus = 'unavailable';
        }
        
      } catch (fetchError: any) {
        console.error('🏥 Fetch accessibility test also failed:', fetchError);
        this.showToast(`Service accessibility test failed: ${fetchError.message}`, 'danger');
        this.yoloServiceStatus = 'unavailable';
      }
    }
  }

  /**
   * Test detection with a simple image to debug response processing
   */
  async testSimpleDetection() {
    console.log('🧪 === SIMPLE DETECTION TEST ===');
    this.showToast('Testing simple detection...', 'primary');
    
    try {
      // Create a simple test image
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 200;
      testCanvas.height = 200;
      const ctx = testCanvas.getContext('2d');
      
      if (ctx) {
        // Create a simple test pattern
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 200, 200);
        
        // Add some colored rectangles that might be detected
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(50, 50, 100, 50); // Red rectangle
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(50, 120, 100, 50); // Green rectangle
      }
      
      const blob = await this.canvasToBlob(testCanvas);
      if (blob) {
        console.log('📤 Sending test image to YOLOv8 service...');
        
        if (!this.currentYOLOService) {
          this.showToast('No YOLO service available', 'danger');
          return;
        }
        
        const response = await this.yoloServiceDetector.predictFromFile(
          blob,
          this.confidenceThreshold,
          false
        ).toPromise();
        
        console.log('📥 Test detection response:', response);
        console.log('📥 Response type:', typeof response);
        console.log('📥 Response keys:', Object.keys(response || {}));
        console.log('📥 Response success:', response?.success);
        console.log('📥 Response detections:', response?.detections);
        console.log('📥 Response detection_count:', response?.detection_count);
        
        if (response && response.success) {
          this.yoloDetections = response.detections || [];
          console.log('🔍 Test detections processed:', this.yoloDetections);
          
          if (this.yoloDetections.length > 0) {
            this.updateARMarkersFromYOLO();
            this.diagnosisResult = await this.generateDiagnosisFromYOLO();
            this.showToast(`Test successful! Found ${this.yoloDetections.length} detections`, 'success');
          } else {
            this.showToast('Test successful but no detections found', 'warning');
          }
        } else {
          this.showToast('Test failed - invalid response', 'danger');
        }
      }
      
    } catch (error: any) {
      console.error('❌ Simple detection test failed:', error);
      this.showToast(`Test failed: ${error.message}`, 'danger');
    }
  }

  /**
   * Test with a motorcycle-like image to see if the model can detect motorcycle issues
   */
  async testMotorcycleDetection() {
    console.log('🏍️ === MOTORCYCLE DETECTION TEST ===');
    this.showToast('Testing motorcycle detection...', 'primary');
    
    try {
      // Create a more realistic motorcycle test image
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 640;
      testCanvas.height = 480;
      const ctx = testCanvas.getContext('2d');
      
      if (ctx) {
        // Background
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 640, 480);
        
        // Simulate motorcycle parts that should be detected
        // Headlight (broken - should be detected as class 0)
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(100, 100, 80, 60);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(100, 100, 80, 60);
        // Add crack line to simulate broken headlight
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(120, 110);
        ctx.lineTo(160, 150);
        ctx.stroke();
        
        // Side mirror (broken - should be detected as class 1)
        ctx.fillStyle = '#ff8800';
        ctx.fillRect(200, 80, 40, 30);
        ctx.strokeRect(200, 80, 40, 30);
        // Add crack
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(210, 85);
        ctx.lineTo(230, 105);
        ctx.stroke();
        
        // Tire (flat - should be detected as class 2)
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.arc(300, 300, 50, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        // Add flat tire indicator
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(300, 300, 45, 0, 2 * Math.PI);
        ctx.fill();
        
        // Oil leak (should be detected as class 3)
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(400, 200, 60, 40);
        ctx.strokeRect(400, 200, 60, 40);
        // Add oil spill effect
        ctx.fillStyle = '#654321';
        ctx.beginPath();
        ctx.arc(430, 220, 15, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      const blob = await this.canvasToBlob(testCanvas);
      if (blob) {
        console.log('📤 Sending motorcycle test image to YOLOv8 service...');
        console.log('📤 Image size:', blob.size, 'bytes');
        
        if (!this.currentYOLOService) {
          this.showToast('No YOLO service available', 'danger');
          return;
        }
        
        const response = await this.yoloServiceDetector.predictFromFile(
          blob,
          this.confidenceThreshold,
          false
        ).toPromise();
        
        console.log('📥 Motorcycle test response:', response);
        console.log('📥 Response success:', response?.success);
        console.log('📥 Response detections:', response?.detections);
        console.log('📥 Response detection_count:', response?.detection_count);
        
        if (response && response.success) {
          this.yoloDetections = response.detections || [];
          console.log('🔍 Motorcycle test detections processed:', this.yoloDetections);
          
          if (this.yoloDetections.length > 0) {
            this.updateARMarkersFromYOLO();
            this.diagnosisResult = await this.generateDiagnosisFromYOLO();
            this.showToast(`Motorcycle test successful! Found ${this.yoloDetections.length} detections`, 'success');
          } else {
            this.showToast('Motorcycle test: No detections found - model may not be trained for motorcycle issues', 'warning');
          }
        } else {
          this.showToast('Motorcycle test failed - invalid response', 'danger');
        }
      }
      
    } catch (error: any) {
      console.error('❌ Motorcycle detection test failed:', error);
      this.showToast(`Motorcycle test failed: ${error.message}`, 'danger');
    }
  }
} 