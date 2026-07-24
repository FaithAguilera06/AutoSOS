import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface WalletTransaction {
  id: number;
  transaction_type: 'topup' | 'payment' | 'refund' | 'withdrawal';
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  payment_method?: 'gcash' | 'facial_recognition' | 'bank_transfer' | 'cash';
  reference_number?: string;
  description?: string;
  created_at: string;
  // Receipt information
  receipt_images?: string[];
  verification_photo?: string;
}

export interface WalletTopupRequest {
  id: number;
  user_id: string;
  amount: number;
  gcash_reference: string;
  receipt_images: string[];
  verification_photo?: string; // Made optional
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  // Client information from joined profile
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
}

export interface FacialPayment {
  id: number;
  client_id: string;
  mechanic_id: string;
  booking_id: number;
  amount: number;
  verification_photo: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  created_at: string;
}

export interface AdminGcashSettings {
  id: number;
  account_name: string;
  account_number: string;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private balanceSubject = new BehaviorSubject<number>(0);
  public balance$ = this.balanceSubject.asObservable();

  constructor(private supabase: SupabaseService) {
    this.loadWalletBalance();
  }

  /**
   * Load current wallet balance
   */
  async loadWalletBalance(): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('get_wallet_balance');
      if (error) throw error;
      
      const balance = data || 0;
      this.balanceSubject.next(balance);
      return balance;
    } catch (error) {
      console.error('Error loading wallet balance:', error);
      return 0;
    }
  }

  /**
   * Get wallet balance as observable
   */
  getBalance(): Observable<number> {
    return this.balance$;
  }

  /**
   * Get wallet transaction history
   */
  async getTransactionHistory(limit: number = 50, offset: number = 0): Promise<WalletTransaction[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_wallet_transactions', {
        p_user_id: null, // null means get transactions for current authenticated user
        p_limit: limit,
        p_offset: offset
      });
      if (error) throw error;
      
      // Enhance transactions with receipt information
      const enhancedTransactions = await Promise.all(
        (data || []).map(async (transaction: WalletTransaction) => {
          // Get receipt information for topup transactions
          if (transaction.transaction_type === 'topup' && transaction.reference_number) {
            try {
              const receiptInfo = await this.getReceiptInfoForTransaction(transaction.id);
              return { ...transaction, ...receiptInfo };
            } catch (error) {
              console.error('Error getting receipt info for transaction:', transaction.id, error);
              return transaction;
            }
          }
          return transaction;
        })
      );
      
      return enhancedTransactions;
    } catch (error) {
      console.error('Error loading transaction history:', error);
      return [];
    }
  }

  /**
   * Get all wallet transactions (admin only)
   */
  async getAllWalletTransactions(limit: number = 50, offset: number = 0): Promise<WalletTransaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading all wallet transactions:', error);
      return [];
    }
  }

  /**
   * Submit GCash topup request
   */
  async submitTopupRequest(
    amount: number,
    gcashReference: string,
    receiptImages: string[],
    verificationPhoto: string | null
  ): Promise<boolean> {
    try {
      // Get current user ID
      const { data: sessionData, error: sessionError } = await this.supabase.getSession();
      if (sessionError || !sessionData.session?.user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await this.supabase
        .from('wallet_topup_requests')
        .insert({
          user_id: sessionData.session.user.id, // Add user_id for RLS policy
          amount,
          gcash_reference: gcashReference,
          receipt_images: receiptImages,
          verification_photo: verificationPhoto || '' // Use empty string if null
        })
        .select()
        .single();

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error submitting topup request:', error);
      return false;
    }
  }

  /**
   * Get user's topup requests
   */
  async getTopupRequests(): Promise<WalletTopupRequest[]> {
    try {
      const { data, error } = await this.supabase
        .from('wallet_topup_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading topup requests:', error);
      return [];
    }
  }

  /**
   * Get all pending topup requests (admin only)
   */
  async getAllTopupRequests(): Promise<WalletTopupRequest[]> {
    try {
      // Check if user is authenticated
      const { data: sessionData } = await this.supabase.getSession();
      
      if (!sessionData.session?.user) {
        throw new Error('User not authenticated');
      }
      
      // Get user profile to verify admin role
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('role')
        .eq('user_id', sessionData.session.user.id)
        .single();
        
      if (profileError) {
        throw profileError;
      }
      
      if (profile?.role !== 'admin') {
        throw new Error('Access denied: Admin role required');
      }
      
      // First try a simple query to see if we can access the table
      const { data, error } = await this.supabase
        .from('wallet_topup_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      
      // If we have data, get the profile information separately
      const mappedData = [];
      for (const request of data || []) {
        const { data: profileData } = await this.supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('user_id', request.user_id)
          .single();
          
        // Get email from auth.users table using RPC function
        const { data: userData } = await this.supabase
          .rpc('get_user_email', { user_uuid: request.user_id });
          
        mappedData.push({
          ...request,
          clientName: profileData?.full_name || 'Unknown',
          clientPhone: profileData?.phone || 'Not provided',
          clientEmail: userData || 'Not provided'
        });
      }
      
      return mappedData;
      
    } catch (error) {
      console.error('Error loading topup requests:', error);
      return [];
    }
  }

  /**
   * Approve topup request (admin only)
   */
  async approveTopupRequest(topupId: number, adminNotes?: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('approve_wallet_topup', {
        p_topup_id: topupId,
        p_admin_notes: adminNotes
      });

      if (error) {
        throw error;
      }
      
      // Reload balance after approval
      await this.loadWalletBalance();
      return true;
    } catch (error) {
      console.error('Error approving topup request:', error);
      return false;
    }
  }

  /**
   * Reject topup request (admin only)
   */
  async rejectTopupRequest(topupId: number, adminNotes: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('reject_wallet_topup', {
        p_topup_id: topupId,
        p_admin_notes: adminNotes
      });

      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error rejecting topup request:', error);
      return false;
    }
  }

  /**
   * Process facial recognition payment (mechanic only)
   */
  async processFacialPayment(
    bookingId: number,
    amount: number,
    verificationPhoto: string,
    facialData?: any
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('process_facial_payment', {
        p_booking_id: bookingId,
        p_amount: amount,
        p_verification_photo: verificationPhoto,
        p_facial_data: facialData
      });

      if (error) throw error;
      
      // Reload balance after payment
      await this.loadWalletBalance();
      return true;
    } catch (error) {
      console.error('Error processing facial payment:', error);
      return false;
    }
  }

  /**
   * Get facial payments for mechanic
   */
  async getFacialPayments(): Promise<FacialPayment[]> {
    try {
      const { data, error } = await this.supabase
        .from('facial_payments')
        .select(`
          *,
          profiles!facial_payments_client_id_fkey (
            full_name
          )
        `)
        .eq('mechanic_id', (await this.supabase.getSession()).data.session?.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading facial payments:', error);
      return [];
    }
  }

  /**
   * Get admin GCash settings
   */
  async getAdminGcashSettings(): Promise<AdminGcashSettings | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_gcash_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error loading admin GCash settings:', error);
      return null;
    }
  }

  /**
   * Update admin GCash settings (admin only)
   */
  async updateAdminGcashSettings(accountName: string, accountNumber: string): Promise<boolean> {
    try {
      // Deactivate current settings
      await this.supabase
        .from('admin_gcash_settings')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert new settings
      const { error } = await this.supabase
        .from('admin_gcash_settings')
        .insert({
          account_name: accountName,
          account_number: accountNumber,
          is_active: true
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating admin GCash settings:', error);
      return false;
    }
  }

  /**
   * Upload receipt images to storage
   */
  async uploadReceiptImages(files: File[]): Promise<string[]> {
    const uploadedUrls: string[] = [];
    
    try {
      // Get session once outside the loop to avoid repeated API calls
      const { data: sessionData, error: sessionError } = await this.supabase.getSession();
      if (sessionError || !sessionData.session?.user?.id) {
        throw new Error('User not authenticated');
      }
      
      const userId = sessionData.session.user.id;
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `wallet_receipts/${userId}/${fileName}`;

        const { data, error } = await this.supabase.storage()
          .from('autosos')
          .upload(filePath, file);

        if (error) {
          console.error('Error uploading file:', file.name, error);
          throw error;
        }

        const { data: urlData } = this.supabase.storage()
          .from('autosos')
          .getPublicUrl(filePath);

        uploadedUrls.push(urlData.publicUrl);
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading receipt images:', error);
      throw error;
    }
  }

  /**
   * Upload verification photo to storage
   */
  async uploadVerificationPhoto(file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `facial_verification/${(await this.supabase.getSession()).data.session?.user.id}/${fileName}`;

      const { data, error } = await this.supabase.storage()
        .from('autosos')
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = this.supabase.storage()
        .from('autosos')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading verification photo:', error);
      throw error;
    }
  }

  /**
   * Convert file to base64 for preview
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Convert base64 to file
   */
  base64ToFile(base64: string, filename: string): File {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  /**
   * Get receipt information for a specific transaction
   */
  async getReceiptInfoForTransaction(transactionId: number): Promise<{ receipt_images?: string[], verification_photo?: string }> {
    try {
      // For topup transactions, get receipt info from wallet_topup_requests
      const { data, error } = await this.supabase
        .from('wallet_topup_requests')
        .select('receipt_images, verification_photo')
        .eq('id', transactionId)
        .single();

      if (error) {
        // If not found in topup requests, try to find by reference number
        const { data: transactionData } = await this.supabase
          .from('wallet_transactions')
          .select('reference_number')
          .eq('id', transactionId)
          .single();

        if (transactionData?.reference_number) {
          const { data: topupData } = await this.supabase
            .from('wallet_topup_requests')
            .select('receipt_images, verification_photo')
            .eq('gcash_reference', transactionData.reference_number)
            .single();

          return {
            receipt_images: topupData?.receipt_images || [],
            verification_photo: topupData?.verification_photo
          };
        }
        return {};
      }

      return {
        receipt_images: data?.receipt_images || [],
        verification_photo: data?.verification_photo
      };
    } catch (error) {
      console.error('Error getting receipt info for transaction:', transactionId, error);
      return {};
    }
  }

  /**
   * Get signed URL for a receipt image
   */
  async getSignedUrlForReceipt(imagePath: string): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage()
        .from('autosos')
        .createSignedUrl(imagePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error generating signed URL for receipt:', imagePath, error);
      return imagePath; // Return original path as fallback
    }
  }
}
