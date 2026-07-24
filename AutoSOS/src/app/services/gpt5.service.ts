import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface GPT5DiagnosticRequest {
  user_message: string;
  yolo_detections?: YOLODetection[];
  user_tier: 'free' | 'premium' | 'emergency';
  emergency_level: 'normal' | 'urgent' | 'critical';
  context?: any;
}

export interface GPT5DiagnosticResponse {
  success: boolean;
  response: string;
  model_used: string;
  cost: number;
  cached: boolean;
  processing_time: number;
  recommendations: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  immediate_actions: string[];
}

export interface YOLODetection {
  bbox: number[];
  confidence: number;
  class_id: number;
  class_name: string;
  class_display_name: string;
  severity: string;
}

export interface CostMetrics {
  monthly_cost: number;
  daily_cost: number;
  requests_today: number;
  average_cost_per_request: number;
  cost_alert: boolean;
}

export interface DiagnosticContext {
  previousDiagnoses: string[];
  userTier: 'free' | 'premium' | 'emergency';
  emergencyLevel: 'normal' | 'urgent' | 'critical';
  yoloDetections: YOLODetection[];
}

@Injectable({
  providedIn: 'root'
})
export class GPT5Service {
  private readonly baseUrl = 'https://autosos-api-gateway.onrender.com';
  private readonly gpt5Endpoint = `${this.baseUrl}/api/gpt5`;
  
  // Cost tracking
  private costMetricsSubject = new BehaviorSubject<CostMetrics | null>(null);
  public costMetrics$ = this.costMetricsSubject.asObservable();
  
  // Service status
  private serviceStatusSubject = new BehaviorSubject<'available' | 'unavailable' | 'checking'>('checking');
  public serviceStatus$ = this.serviceStatusSubject.asObservable();
  
  // Diagnostic context
  private diagnosticContextSubject = new BehaviorSubject<DiagnosticContext>({
    previousDiagnoses: [],
    userTier: 'free',
    emergencyLevel: 'normal',
    yoloDetections: []
  });
  public diagnosticContext$ = this.diagnosticContextSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkServiceHealth();
    this.loadCostMetrics();
  }

  /**
   * Check GPT-5 service health
   */
  checkServiceHealth(): void {
    this.serviceStatusSubject.next('checking');
    
    this.http.get(`${this.baseUrl}/health`).subscribe({
      next: (response: any) => {
        const gpt5Available = response.services?.gpt5 === true;
        this.serviceStatusSubject.next(gpt5Available ? 'available' : 'unavailable');
      },
      error: () => {
        this.serviceStatusSubject.next('unavailable');
      }
    });
  }

  /**
   * Generate diagnostic response using GPT-5 with intelligent routing
   */
  generateDiagnostic(request: GPT5DiagnosticRequest): Observable<GPT5DiagnosticResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<GPT5DiagnosticResponse>(
      `${this.gpt5Endpoint}/diagnostic`,
      request,
      { headers }
    ).pipe(
      tap(response => {
        // Update diagnostic context
        this.updateDiagnosticContext(request, response);
        
        // Update cost metrics
        this.loadCostMetrics();
      }),
      catchError(error => {
        console.error('GPT-5 diagnostic error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Complete diagnostic with YOLOv8 + GPT-5
   */
  completeDiagnostic(
    imageFile: File,
    userMessage: string,
    userTier: 'free' | 'premium' | 'emergency' = 'free',
    emergencyLevel: 'normal' | 'urgent' | 'critical' = 'normal'
  ): Observable<any> {
    const formData = new FormData();
    formData.append('image_file', imageFile);
    formData.append('user_message', userMessage);
    formData.append('user_tier', userTier);
    formData.append('emergency_level', emergencyLevel);

    return this.http.post(`${this.baseUrl}/api/diagnostic/complete`, formData).pipe(
      tap(response => {
        // Update diagnostic context
        const context = this.diagnosticContextSubject.value;
        context.yoloDetections = (response as any).data?.visual_analysis?.detections || [];
        this.diagnosticContextSubject.next(context);
        
        // Update cost metrics
        this.loadCostMetrics();
      }),
      catchError(error => {
        console.error('Complete diagnostic error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current cost metrics
   */
  loadCostMetrics(): void {
    this.http.get<CostMetrics>(`${this.gpt5Endpoint}/cost-metrics`).subscribe({
      next: (metrics) => {
        this.costMetricsSubject.next(metrics);
      },
      error: (error) => {
        console.error('Failed to load cost metrics:', error);
      }
    });
  }

  /**
   * Update diagnostic context
   */
  private updateDiagnosticContext(request: GPT5DiagnosticRequest, response: GPT5DiagnosticResponse): void {
    const context = this.diagnosticContextSubject.value;
    
    // Add to previous diagnoses
    context.previousDiagnoses.unshift(request.user_message);
    if (context.previousDiagnoses.length > 10) {
      context.previousDiagnoses = context.previousDiagnoses.slice(0, 10);
    }
    
    // Update user tier and emergency level
    context.userTier = request.user_tier;
    context.emergencyLevel = request.emergency_level;
    
    // Update YOLO detections if provided
    if (request.yolo_detections) {
      context.yoloDetections = request.yolo_detections;
    }
    
    this.diagnosticContextSubject.next(context);
  }

  /**
   * Set user tier
   */
  setUserTier(tier: 'free' | 'premium' | 'emergency'): void {
    const context = this.diagnosticContextSubject.value;
    context.userTier = tier;
    this.diagnosticContextSubject.next(context);
  }

  /**
   * Set emergency level
   */
  setEmergencyLevel(level: 'normal' | 'urgent' | 'critical'): void {
    const context = this.diagnosticContextSubject.value;
    context.emergencyLevel = level;
    this.diagnosticContextSubject.next(context);
  }

  /**
   * Update YOLO detections
   */
  updateYOLODetections(detections: YOLODetection[]): void {
    const context = this.diagnosticContextSubject.value;
    context.yoloDetections = detections;
    this.diagnosticContextSubject.next(context);
  }

  /**
   * Get current diagnostic context
   */
  getCurrentContext(): DiagnosticContext {
    return this.diagnosticContextSubject.value;
  }

  /**
   * Check if GPT-5 should be used based on context
   */
  shouldUseGPT5(userMessage: string): boolean {
    const context = this.getCurrentContext();
    
    // Emergency situations always use GPT-5
    if (context.emergencyLevel === 'critical') {
      return true;
    }
    
    // Premium users get GPT-5 access
    if (context.userTier === 'premium') {
      return true;
    }
    
    // Complex requests with YOLOv8 detections
    if (context.yoloDetections.length > 0) {
      return true;
    }
    
    // Check if request complexity warrants GPT-5
    const complexKeywords = [
      'emergency', 'urgent', 'critical', 'dangerous', 'safety',
      'complex', 'multiple', 'advanced', 'detailed', 'comprehensive'
    ];
    
    return complexKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword)
    );
  }

  /**
   * Generate enhanced prompt for GPT-5
   */
  generateEnhancedPrompt(userMessage: string): string {
    const context = this.getCurrentContext();
    
    let prompt = `Hey there! I'm your motorcycle mechanic, and I'm here to help you with your bike. Let me take a look at what's going on.\n\n**What you're telling me:** ${userMessage}\n\n`;
    
    if (context.yoloDetections.length > 0) {
      prompt += `**What I can see from the visual inspection:**\n`;
      context.yoloDetections.forEach((detection, index) => {
        prompt += `\nIssue #${index + 1}: ${detection.class_display_name}\n`;
        prompt += `- How confident I am: ${(detection.confidence * 100).toFixed(1)}%\n`;
        prompt += `- How serious this looks: ${detection.severity}\n`;
        prompt += `- Where I spotted it: [${detection.bbox.join(', ')}]\n`;
      });
    }
    
    if (context.previousDiagnoses.length > 0) {
      prompt += `\n**Previous issues we've discussed:**\n`;
      context.previousDiagnoses.slice(0, 3).forEach((diagnosis, index) => {
        prompt += `${index + 1}. ${diagnosis}\n`;
      });
    }
    
    prompt += `\nPlease answer in this EXACT format:\n\n`;
    prompt += `**What is the problem?**\n`;
    prompt += `[Explain the specific issue you've identified]\n\n`;
    prompt += `**How to fix or remedy the problem?**\n`;
    prompt += `[Give step-by-step instructions to fix it]\n\n`;
    prompt += `**Is mechanic needed?**\n`;
    prompt += `[Yes/No - and explain why]\n\n`;
    prompt += `**Can I ride the motorcycle?**\n`;
    prompt += `[Yes/No - and explain the safety implications]\n\n`;
    prompt += `Keep your response concise and practical. Focus on what the rider needs to know right now.`;
    
    return prompt;
  }

  /**
   * Get cost optimization tips
   */
  getCostOptimizationTips(): string[] {
    const metrics = this.costMetricsSubject.value;
    const tips: string[] = [];
    
    if (metrics?.cost_alert) {
      tips.push('⚠️ Monthly cost limit approaching. Consider using free tier for simple queries.');
    }
    
    if (metrics?.average_cost_per_request && metrics.average_cost_per_request > 0.05) {
      tips.push('💡 High cost per request detected. Try to be more specific in your questions.');
    }
    
    if (metrics?.requests_today && metrics.requests_today > 50) {
      tips.push('📊 High usage today. Consider caching common questions.');
    }
    
    tips.push('🆓 Use free tier for simple diagnostic questions');
    tips.push('🎯 Be specific in your descriptions to reduce token usage');
    tips.push('💾 Cached responses are free and instant');
    
    return tips;
  }

  /**
   * Clear diagnostic context
   */
  clearContext(): void {
    this.diagnosticContextSubject.next({
      previousDiagnoses: [],
      userTier: 'free',
      emergencyLevel: 'normal',
      yoloDetections: []
    });
  }
}
