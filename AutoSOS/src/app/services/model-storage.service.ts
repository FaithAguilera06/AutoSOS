import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { HttpClient } from '@angular/common/http';
import { Observable, from, throwError, BehaviorSubject } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';

export interface MLModel {
  id: number;
  model_name: string;
  model_type: 'yolov8' | 'facenet' | 'custom';
  version: string;
  description?: string;
  file_path: string;
  file_size?: number;
  file_hash?: string;
  model_config?: any;
  performance_metrics?: any;
  status: 'active' | 'inactive' | 'deprecated' | 'training';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModelUsageLog {
  id: number;
  model_id: number;
  user_id?: string;
  inference_time_ms?: number;
  input_size?: string;
  confidence_score?: number;
  success: boolean;
  error_message?: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModelStorageService {
  private readonly BUCKET_NAME = 'autosos';
  private readonly MODELS_FOLDER = 'models';
  private readonly CACHE_FOLDER = 'cached_models';
  
  // Cache for downloaded models
  private modelCache = new Map<string, ArrayBuffer>();
  private cacheStatus = new BehaviorSubject<Map<string, boolean>>(new Map());

  constructor(
    private supabase: SupabaseService,
    private http: HttpClient
  ) {}

  /**
   * Get all models of a specific type
   */
  getModelsByType(modelType: 'yolov8' | 'facenet' | 'custom'): Observable<MLModel[]> {
    return from(
      this.supabase.from('ml_models')
        .select('*')
        .eq('model_type', modelType)
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as MLModel[];
      }),
      catchError(error => {
        console.error('Error fetching models:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get the active default model for a specific type
   */
  getActiveModel(modelType: 'yolov8' | 'facenet' | 'custom'): Observable<MLModel | null> {
    return from(
      this.supabase.rpc('get_active_model', { p_model_type: modelType })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data && response.data.length > 0 ? response.data[0] as MLModel : null;
      }),
      catchError(error => {
        console.error('Error fetching active model:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get the latest model for a specific type
   */
  getLatestModel(modelType: 'yolov8' | 'facenet' | 'custom'): Observable<MLModel | null> {
    return from(
      this.supabase.rpc('get_latest_model', { p_model_type: modelType })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data && response.data.length > 0 ? response.data[0] as MLModel : null;
      }),
      catchError(error => {
        console.error('Error fetching latest model:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Download and cache a model file
   */
  downloadModel(model: MLModel): Observable<ArrayBuffer> {
    const cacheKey = `${model.model_type}_${model.version}`;
    
    // Check if model is already cached
    if (this.modelCache.has(cacheKey)) {
      console.log(`Model ${cacheKey} already cached`);
      return new Observable(observer => {
        observer.next(this.modelCache.get(cacheKey)!);
        observer.complete();
      });
    }

    console.log(`Downloading model: ${model.file_path}`);
    
    // Update cache status
    const currentStatus = this.cacheStatus.value;
    currentStatus.set(cacheKey, false);
    this.cacheStatus.next(currentStatus);

    return from(
      this.supabase.storage()
        .from(this.BUCKET_NAME)
        .download(model.file_path)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      }),
      switchMap(blob => {
        return from(new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        }));
      }),
      tap(arrayBuffer => {
        // Cache the model
        this.modelCache.set(cacheKey, arrayBuffer);
        
        // Update cache status
        const currentStatus = this.cacheStatus.value;
        currentStatus.set(cacheKey, true);
        this.cacheStatus.next(currentStatus);
        
        console.log(`Model ${cacheKey} cached successfully`);
      }),
      catchError(error => {
        console.error('Error downloading model:', error);
        
        // Update cache status to failed
        const currentStatus = this.cacheStatus.value;
        currentStatus.set(cacheKey, false);
        this.cacheStatus.next(currentStatus);
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Get cached model if available
   */
  getCachedModel(modelType: 'yolov8' | 'facenet' | 'custom', version: string): ArrayBuffer | null {
    const cacheKey = `${modelType}_${version}`;
    return this.modelCache.get(cacheKey) || null;
  }

  /**
   * Check if model is cached
   */
  isModelCached(modelType: 'yolov8' | 'facenet' | 'custom', version: string): boolean {
    const cacheKey = `${modelType}_${version}`;
    return this.modelCache.has(cacheKey);
  }

  /**
   * Get cache status observable
   */
  getCacheStatus(): Observable<Map<string, boolean>> {
    return this.cacheStatus.asObservable();
  }

  /**
   * Clear model cache
   */
  clearCache(): void {
    this.modelCache.clear();
    this.cacheStatus.next(new Map());
    console.log('Model cache cleared');
  }

  /**
   * Clear specific model from cache
   */
  clearModelFromCache(modelType: 'yolov8' | 'facenet' | 'custom', version: string): void {
    const cacheKey = `${modelType}_${version}`;
    this.modelCache.delete(cacheKey);
    
    const currentStatus = this.cacheStatus.value;
    currentStatus.delete(cacheKey);
    this.cacheStatus.next(currentStatus);
    
    console.log(`Model ${cacheKey} removed from cache`);
  }

  /**
   * Upload a new model (Admin only)
   */
  uploadModel(
    modelFile: File,
    modelName: string,
    modelType: 'yolov8' | 'facenet' | 'custom',
    version: string,
    description?: string,
    modelConfig?: any,
    performanceMetrics?: any
  ): Observable<any> {
    const filePath = `${this.MODELS_FOLDER}/${modelType}/${modelName}_v${version}.${this.getFileExtension(modelFile.name)}`;
    
    // First upload the file to storage
    return from(
      this.supabase.storage()
        .from(this.BUCKET_NAME)
        .upload(filePath, modelFile, {
          cacheControl: '3600',
          upsert: false
        })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      }),
      map(uploadData => {
        // Then create the database record
        return from(
          this.supabase.from('ml_models')
            .insert({
              model_name: modelName,
              model_type: modelType,
              version: version,
              description: description,
              file_path: filePath,
              file_size: modelFile.size,
              file_hash: this.calculateFileHash(modelFile), // You'll need to implement this
              model_config: modelConfig,
              performance_metrics: performanceMetrics,
              status: 'active',
              is_default: false
            })
        );
      }),
      map(observable => observable),
      catchError(error => {
        console.error('Error uploading model:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Set default model (Admin only)
   */
  setDefaultModel(modelId: number): Observable<boolean> {
    return from(
      this.supabase.rpc('set_default_model', { p_model_id: modelId })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError(error => {
        console.error('Error setting default model:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Log model usage
   */
  logModelUsage(
    modelId: number,
    inferenceTimeMs?: number,
    inputSize?: string,
    confidenceScore?: number,
    success: boolean = true,
    errorMessage?: string
  ): Observable<number> {
    return from(
      this.supabase.rpc('log_model_usage', {
        p_model_id: modelId,
        p_inference_time_ms: inferenceTimeMs,
        p_input_size: inputSize,
        p_confidence_score: confidenceScore,
        p_success: success,
        p_error_message: errorMessage
      })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError(error => {
        console.error('Error logging model usage:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get model usage statistics
   */
  getModelUsageStats(modelId: number, days: number = 30): Observable<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return from(
      this.supabase.from('model_usage_logs')
        .select('*')
        .eq('model_id', modelId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as ModelUsageLog[];
      }),
      catchError(error => {
        console.error('Error fetching model usage stats:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Helper method to get file extension
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop() || '';
  }

  /**
   * Helper method to calculate file hash (simplified version)
   * In production, you should use a proper hashing library
   */
  private calculateFileHash(file: File): string {
    // This is a simplified hash calculation
    // In production, use crypto.subtle.digest() or a proper hashing library
    return `${file.name}_${file.size}_${file.lastModified}`;
  }

  /**
   * Get model download URL (for direct download)
   */
  getModelDownloadUrl(model: MLModel): Observable<string> {
    return from(
      this.supabase.storage()
        .from(this.BUCKET_NAME)
        .createSignedUrl(model.file_path, 3600) // 1 hour expiry
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data.signedUrl;
      }),
      catchError(error => {
        console.error('Error creating download URL:', error);
        return throwError(() => error);
      })
    );
  }
}
