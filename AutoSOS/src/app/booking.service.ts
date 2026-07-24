import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { MultiCriteriaScoringService, MechanicScore } from './services/multi-criteria-scoring.service';
import type { Booking, MatchRow } from './models';

@Injectable({ providedIn: 'root' })
export class BookingService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly scoringService: MultiCriteriaScoringService
  ) {}

  async createBooking(input: {
    required_specialization: string;
    notes?: string | null;
    latitude: number;
    longitude: number;
    payment_method?: string;
    motorcycle_model?: string;
    client_phone?: string;
  }): Promise<Booking> {
    const { data: sessionData } = await this.supabase.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error('Not authenticated');
    const { latitude, longitude, ...restInput } = input;
    const payload = { 
      ...restInput, 
      client_id: userId,
      client_latitude: latitude,
      client_longitude: longitude,
      // Explicitly set payment status to pending for new bookings
      payment_status: 'pending',
      payment_completed_at: null
    };
    const { data, error } = await this.supabase
      .from('bookings')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return data as Booking;
  }

  async myBookings(): Promise<Booking[]> {
    const { data: sessionData } = await this.supabase.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return [];
    const { data, error } = await this.supabase
      .from('bookings')
      .select('*')
      .or(`client_id.eq.${userId},mechanic_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Booking[];
  }

  async matchCandidates(bookingId: number): Promise<MatchRow[]> {
    const { data, error } = await this.supabase.rpc('match_mechanics_for_booking', { p_booking_id: bookingId });
    if (error) throw error;
    return data as MatchRow[];
  }

  /**
   * Get enhanced mechanic matches with detailed scoring breakdown
   */
  async getEnhancedMatches(bookingId: number): Promise<MechanicScore[]> {
    const { data, error } = await this.supabase.rpc('match_mechanics_for_booking', { p_booking_id: bookingId });
    if (error) throw error;
    
    // Get booking details for additional context
    const { data: bookingData, error: bookingError } = await this.supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();
    
    if (bookingError) throw bookingError;
    
    // Get mechanic profiles for additional data
    const mechanicIds = data.map((match: any) => match.mechanic_id);
    const { data: mechanicProfiles, error: profileError } = await this.supabase
      .from('profiles')
      .select('*')
      .in('user_id', mechanicIds);
    
    if (profileError) throw profileError;
    
    // Combine data and calculate enhanced scores
    const enhancedMatches = data.map((match: any) => {
      const profile = mechanicProfiles.find(p => p.user_id === match.mechanic_id);
      const mechanicData = {
        ...profile,
        distance: match.distance_km,
        distance_km: match.distance_km
      };
      
      return this.scoringService.calculateMechanicScore(mechanicData, bookingData);
    });
    
    return enhancedMatches.sort((a: MechanicScore, b: MechanicScore) => b.totalScore - a.totalScore);
  }

  /**
   * Auto-assign best mechanic based on scoring
   */
  async autoAssignBestMechanic(bookingId: number): Promise<{ success: boolean; mechanicId?: string; score?: number }> {
    try {
      const matches = await this.getEnhancedMatches(bookingId);
      
      if (matches.length === 0) {
        return { success: false };
      }
      
      const bestMatch = matches[0];
      
      // Only auto-assign if score is above threshold (0.6)
      if (bestMatch.totalScore >= 0.6) {
        const { error } = await this.supabase
          .from('bookings')
          .update({
            mechanic_id: bestMatch.mechanicId,
            status: 'matched',
            mechanic_score: bestMatch.totalScore
          })
          .eq('id', bookingId);
        
        if (error) throw error;
        
        return {
          success: true,
          mechanicId: bestMatch.mechanicId,
          score: bestMatch.totalScore
        };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Error auto-assigning mechanic:', error);
      return { success: false };
    }
  }

  async cancelBooking(bookingId: number): Promise<void> {
    const { data: sessionData } = await this.supabase.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        mechanic_id: null
      })
      .eq('id', bookingId)
      .or(`client_id.eq.${userId},mechanic_id.eq.${userId}`);
    
    if (error) throw error;
  }

  async updateBookingStatus(bookingId: number, status: string, mechanicId?: string | null): Promise<void> {
    const { data: sessionData } = await this.supabase.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error('Not authenticated');

    const updateData: any = { status };
    if (mechanicId !== undefined) {
      updateData.mechanic_id = mechanicId;
    }

    const { error } = await this.supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .or(`client_id.eq.${userId},mechanic_id.eq.${userId}`);
    
    if (error) throw error;
  }

  async updatePaymentStatus(bookingId: number, paymentStatus: string, paymentMethod?: string): Promise<void> {
    const { data: sessionData } = await this.supabase.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error('Not authenticated');

    const updateData: any = { 
      payment_status: paymentStatus,
      payment_completed_at: paymentStatus === 'paid' ? new Date().toISOString() : null
    };
    
    if (paymentMethod) {
      updateData.payment_method = paymentMethod;
    }

    const { error } = await this.supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .or(`client_id.eq.${userId},mechanic_id.eq.${userId}`);
    
    if (error) throw error;
  }
}


