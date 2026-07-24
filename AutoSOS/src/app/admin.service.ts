import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { Booking, Profile } from './models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private readonly supabase: SupabaseService) {}

  async listMechanicsPendingApproval(): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('role', 'mechanic')
      .eq('approved', false);
    if (error) throw error;
    return data as Profile[];
  }

  async approveMechanic(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ approved: true })
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return data as Profile;
  }

  async assignBestMechanic(bookingId: number) {
    const { data, error } = await this.supabase.rpc('assign_best_mechanic', { p_booking_id: bookingId });
    if (error) throw error;
    // fetch updated booking
    const { data: b, error: e2 } = await this.supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();
    if (e2) throw e2;
    return b as Booking;
  }

  async getAllClients(): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client');
    if (error) throw error;
    
    // Transform the data to include username (using email from profiles table)
    return data.map((profile: any) => ({
      ...profile,
      username: profile.email || profile.user_id, // Use email from profiles table
      email: profile.email || profile.user_id
    })) as Profile[];
  }

  async getAllMechanics(): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('role', 'mechanic');
    if (error) throw error;
    return data as Profile[];
  }

  async listMechanicsApproved(): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('role', 'mechanic')
      .eq('approved', true);
    if (error) throw error;
    return data as Profile[];
  }

  async deleteUser(userId: string) {
    const { error } = await this.supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  }

  async rejectMechanic(userId: string) {
    const { error } = await this.supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId)
      .eq('role', 'mechanic');
    if (error) throw error;
  }

  async getMechanicDocuments(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('mechanic_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getSignedUrlForDocument(filePath: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage()
      .from('autosos')
      .createSignedUrl(`mechanic_docs/${filePath}`, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  }
}


