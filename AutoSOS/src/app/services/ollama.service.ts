import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  context?: number[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    seed?: number;
  };
}

export interface DiagnosticContext {
  motorcycleType?: string;
  problemCategory?: string;
  symptoms?: string[];
  previousDiagnoses?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class OllamaService {
  private readonly baseUrl = 'https://autosos-ollama.onrender.com'; // AutoSOS Cloud Ollama Service
  private readonly defaultModel = 'llama3.2:3b'; // Lightweight model for mobile
  private readonly diagnosticModel = 'llama3.2:3b'; // Can be changed to a specialized model
  
  private availableModelsSubject = new BehaviorSubject<OllamaModel[]>([]);
  public availableModels$ = this.availableModelsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadAvailableModels();
  }

  /**
   * Load available models from Ollama
   */
  loadAvailableModels(): void {
    this.http.get<{ models: OllamaModel[] }>(`${this.baseUrl}/api/tags`)
      .pipe(
        map(response => response.models),
        catchError(this.handleError)
      )
      .subscribe({
        next: (models) => {
          this.availableModelsSubject.next(models);
          console.log('Available Ollama models:', models);
        },
        error: (error) => {
          console.error('Failed to load Ollama models:', error);
          this.availableModelsSubject.next([]);
        }
      });
  }

  /**
   * Check if Ollama service is available
   */
  isOllamaAvailable(): Observable<boolean> {
    return this.http.get(`${this.baseUrl}/health`)
      .pipe(
        map(() => true),
        catchError(() => {
          console.warn('Ollama service is not available');
          return [false];
        })
      );
  }

  /**
   * Generate diagnostic response using Ollama
   */
  generateDiagnosticResponse(
    userMessage: string, 
    context?: DiagnosticContext,
    model: string = this.diagnosticModel
  ): Observable<OllamaResponse> {
    const diagnosticPrompt = this.buildDiagnosticPrompt(userMessage, context);
    
    const request: OllamaRequest = {
      model: model,
      prompt: diagnosticPrompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1
      }
    };

    return this.http.post<OllamaResponse>(`${this.baseUrl}/api/diagnostic`, {
      model: model,
      prompt: diagnosticPrompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1
      }
    })
      .pipe(
        map(response => response),
        catchError(this.handleError)
      );
  }

  /**
   * Stream diagnostic response for real-time updates
   */
  streamDiagnosticResponse(
    userMessage: string,
    context?: DiagnosticContext,
    model: string = this.diagnosticModel
  ): Observable<OllamaResponse> {
    const diagnosticPrompt = this.buildDiagnosticPrompt(userMessage, context);
    
    const request: OllamaRequest = {
      model: model,
      prompt: diagnosticPrompt,
      stream: true,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1
      }
    };

    return this.http.post<OllamaResponse>(`${this.baseUrl}/api/generate`, request, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      })
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Build specialized diagnostic prompt for motorcycle issues
   */
  private buildDiagnosticPrompt(userMessage: string, context?: DiagnosticContext): string {
    const basePrompt = `You are an expert motorcycle mechanic and diagnostic specialist. Your role is to help users diagnose motorcycle problems through detailed analysis and provide actionable recommendations.

IMPORTANT GUIDELINES:
1. Always prioritize safety - if there's any safety concern, emphasize it immediately
2. Provide specific, actionable advice
3. Include severity levels: Low, Medium, High, Critical
4. Suggest both immediate actions and long-term solutions
5. Consider cost-effective solutions when possible
6. Always recommend professional inspection for complex issues

RESPONSE FORMAT:
Provide your response in the following JSON format:
{
  "analysis": "Detailed analysis of the problem",
  "diagnosis": {
    "issue": "Specific issue identified",
    "severity": "Low|Medium|High|Critical",
    "recommendation": "Specific actionable recommendation",
    "immediate_actions": ["Action 1", "Action 2"],
    "long_term_solutions": ["Solution 1", "Solution 2"],
    "safety_warning": "Any safety concerns (if applicable)"
  },
  "follow_up_questions": ["Question 1", "Question 2"]
}

CONTEXT INFORMATION:`;

    let contextInfo = '';
    if (context) {
      if (context.motorcycleType) {
        contextInfo += `\nMotorcycle Type: ${context.motorcycleType}`;
      }
      if (context.problemCategory) {
        contextInfo += `\nProblem Category: ${context.problemCategory}`;
      }
      if (context.symptoms && context.symptoms.length > 0) {
        contextInfo += `\nReported Symptoms: ${context.symptoms.join(', ')}`;
      }
      if (context.previousDiagnoses && context.previousDiagnoses.length > 0) {
        contextInfo += `\nPrevious Diagnoses: ${context.previousDiagnoses.join(', ')}`;
      }
    }

    return `${basePrompt}${contextInfo}

USER PROBLEM DESCRIPTION: ${userMessage}

Please analyze this motorcycle problem and provide a comprehensive diagnostic response in the specified JSON format.`;
  }

  /**
   * Parse Ollama response and extract diagnostic information
   */
  parseDiagnosticResponse(response: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: create a structured response from plain text
      return {
        analysis: response,
        diagnosis: {
          issue: "General Motorcycle Problem",
          severity: "Medium",
          recommendation: response,
          immediate_actions: ["Inspect the motorcycle", "Check for obvious issues"],
          long_term_solutions: ["Schedule professional inspection"],
          safety_warning: null
        },
        follow_up_questions: ["Can you provide more specific details about the problem?"]
      };
    } catch (error) {
      console.error('Error parsing diagnostic response:', error);
      return {
        analysis: response,
        diagnosis: {
          issue: "General Motorcycle Problem",
          severity: "Medium",
          recommendation: response,
          immediate_actions: ["Inspect the motorcycle", "Check for obvious issues"],
          long_term_solutions: ["Schedule professional inspection"],
          safety_warning: null
        },
        follow_up_questions: ["Can you provide more specific details about the problem?"]
      };
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  pullModel(modelName: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/pull`, { name: modelName })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get model information
   */
  getModelInfo(modelName: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/show`, { name: modelName })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Error handling
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 0:
          errorMessage = 'Cannot connect to Ollama service. Please ensure Ollama is running on localhost:11434';
          break;
        case 404:
          errorMessage = 'Ollama model not found. Please check if the model is installed.';
          break;
        case 500:
          errorMessage = 'Ollama server error. Please try again later.';
          break;
        default:
          errorMessage = `Server Error: ${error.status} - ${error.message}`;
      }
    }
    
    console.error('Ollama Service Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Get available models list
   */
  getAvailableModels(): OllamaModel[] {
    return this.availableModelsSubject.value;
  }

  /**
   * Check if a specific model is available
   */
  isModelAvailable(modelName: string): boolean {
    const models = this.getAvailableModels();
    return models.some(model => model.name === modelName);
  }

  /**
   * Get recommended models for different use cases
   */
  getRecommendedModels(): { [key: string]: string } {
    return {
      'diagnostic': 'llama3.2:3b', // Lightweight for mobile
      'detailed': 'llama3.2:7b', // More detailed responses
      'fast': 'llama3.2:1b', // Fastest responses
      'specialized': 'llama3.2:3b' // Can be replaced with specialized model
    };
  }
}
