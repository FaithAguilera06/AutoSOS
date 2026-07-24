import { Injectable } from '@angular/core';
import { createClient, type SupabaseClient, type Session, type AuthError } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  // Public getter for supabase client
  get client() {
    return this.supabase;
  }

  // Auth
  getSession() {
    return this.supabase.auth.getSession();
  }

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange((_event, _session) => callback(_event, _session));
  }

  signUpWithEmail(email: string, password: string) {
    return this.supabase.auth.signUp({ email, password });
  }

  signInWithEmail(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  signOut() {
    return this.supabase.auth.signOut();
  }

  // Generic data helpers
  from(table: string) {
    return this.supabase.from(table);
  }

  rpc(fn: string, params?: Record<string, unknown>) {
    return this.supabase.rpc(fn, params ?? {});
  }

  // Storage helpers
  storage() {
    return this.supabase.storage;
  }
}


