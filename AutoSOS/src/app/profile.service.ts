import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { AvailabilityStatus, Profile, UserRole } from './models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private readonly supabase: SupabaseService) {}

  async getMyProfile(): Promise<Profile | null> {
    const { data: sessionData } = await this.supabase.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return null;
    const { data, error } = await this.supabase.from('profiles').select('*').eq('user_id', userId).single();
    if (error) throw error;
    return data as Profile;
  }

  async updateMyProfile(patch: Partial<Profile>): Promise<Profile> {
    console.log('=== PROFILE SERVICE: updateMyProfile ===');
    console.log('Patch data:', patch);
    
    const { data: sessionData } = await this.supabase.getSession();
    const userId = sessionData.session?.user.id;
    console.log('User ID:', userId);
    
    if (!userId) throw new Error('Not authenticated');
    
    console.log('Updating profile with patch:', patch);
    const { data, error } = await this.supabase
      .from('profiles')
      .update(patch)
      .eq('user_id', userId)
      .select('*')
      .single();
      
    if (error) {
      console.error('❌ Profile update error:', error);
      throw error;
    }
    
    console.log('✅ Profile updated successfully:', data);
    return data as Profile;
  }

  async setRole(userId: string, role: UserRole) {
    const { error } = await this.supabase.from('profiles').update({ role }).eq('user_id', userId);
    if (error) throw error;
  }

  async setAvailability(status: AvailabilityStatus) {
    return this.updateMyProfile({ availability: status } as Partial<Profile>);
  }

  async setLocation(latitude: number, longitude: number) {
    return this.updateMyProfile({ latitude, longitude } as Partial<Profile>);
  }

  async listAvailableMechanics(requiredSpecialization?: string) {
    let query = this.supabase
      .from('profiles')
      .select('*')
      .eq('role', 'mechanic')
      .eq('approved', true)
      .eq('availability', 'available');
    if (requiredSpecialization) {
      query = query.contains('specialization', [requiredSpecialization]);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as Profile[];
  }
}


