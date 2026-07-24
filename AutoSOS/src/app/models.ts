export type UserRole = 'client' | 'mechanic' | 'admin';
export type BookingStatus = 'pending' | 'assigned' | 'matched' | 'in_progress' | 'service_completed' | 'payment_pending' | 'completed' | 'cancelled';
export type AvailabilityStatus = 'available' | 'not_available';
export type PaymentMethod = 'cash' | 'facial_recognition';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Profile {
  user_id: string;
  full_name: string | null;
  role: UserRole;
  approved: boolean;
  availability: AvailabilityStatus;
  specialization: string[];
  latitude: number | null;
  longitude: number | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  // Optional fields that may be available from auth.users
  email?: string | null;
  username?: string | null; // Added username field
  phone?: string | null;
  motorcycle_model?: string | null;
}

export interface Booking {
  id: number;
  client_id: string;
  mechanic_id: string | null;
  status: BookingStatus;
  required_specialization: string;
  notes: string | null;
  // Client location
  client_latitude: number | null;
  client_longitude: number | null;
  // Mechanic location
  mechanic_latitude: number | null;
  mechanic_longitude: number | null;
  // Service details
  service_price: number | null;
  motorcycle_model: string | null;
  client_phone: string | null;
  // Payment information
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  payment_completed_at: string | null;
  // Service completion
  service_completed_at: string | null;
  // Matching and scoring
  mechanic_score: number | null;
  distance_km: number | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  // Additional fields
  priority?: 'urgent' | 'normal';
}

export interface MatchRow {
  mechanic_id: string;
  distance_km: number;
  specialization_match: boolean;
  score: number;
  distance_score?: number;
  specialization_score?: number;
  rating_score?: number;
  availability_score?: number;
  experience_score?: number;
  response_time_score?: number;
}

export type MechanicDocStatus = 'submitted' | 'approved' | 'rejected';
export interface MechanicDocument {
  id: number;
  user_id: string;
  doc_type: string; // e.g., 'id_card','certificate','license'
  file_path: string;
  public_url: string | null;
  status: MechanicDocStatus;
  created_at: string;
}


