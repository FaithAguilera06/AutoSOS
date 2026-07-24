import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SupabaseService } from '../supabase.service';
import { ProfileService } from '../profile.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private supabaseService: SupabaseService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    try {
      // Check if user is authenticated
      const { data: sessionData } = await this.supabaseService.getSession();
      
      if (!sessionData.session?.user) {
        this.router.navigate(['/login']);
        return false;
      }

      // Get user profile to check role
      const profile = await this.profileService.getMyProfile();
      
      if (!profile) {
        this.router.navigate(['/role-selection']);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Auth guard error:', error);
      this.router.navigate(['/login']);
      return false;
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private supabaseService: SupabaseService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    try {
      // Check if user is authenticated
      const { data: sessionData } = await this.supabaseService.getSession();
      
      if (!sessionData.session?.user) {
        this.router.navigate(['/login']);
        return false;
      }

      // Get user profile to check role
      const profile = await this.profileService.getMyProfile();
      
      if (!profile) {
        this.router.navigate(['/role-selection']);
        return false;
      }

      // Check if user is admin
      if (profile.role !== 'admin') {
        // Redirect to appropriate page based on role
        switch (profile.role) {
          case 'client':
            this.router.navigate(['/client']);
            break;
          case 'mechanic':
            if (profile.approved) {
              this.router.navigate(['/mechanic']);
            } else {
              this.router.navigate(['/mechanic/pending']);
            }
            break;
          default:
            this.router.navigate(['/client']);
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Admin guard error:', error);
      this.router.navigate(['/login']);
      return false;
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class MechanicGuard implements CanActivate {
  constructor(
    private supabaseService: SupabaseService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    try {
      // Check if user is authenticated
      const { data: sessionData } = await this.supabaseService.getSession();
      
      if (!sessionData.session?.user) {
        this.router.navigate(['/login']);
        return false;
      }

      // Get user profile to check role
      const profile = await this.profileService.getMyProfile();
      
      if (!profile) {
        this.router.navigate(['/role-selection']);
        return false;
      }

      // Check if user is mechanic
      if (profile.role !== 'mechanic') {
        // Redirect to appropriate page based on role
        switch (profile.role) {
          case 'client':
            this.router.navigate(['/client']);
            break;
          case 'admin':
            this.router.navigate(['/admin']);
            break;
          default:
            this.router.navigate(['/client']);
        }
        return false;
      }

      // Check if mechanic is approved
      if (!profile.approved) {
        this.router.navigate(['/mechanic/pending']);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Mechanic guard error:', error);
      this.router.navigate(['/login']);
      return false;
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class ClientGuard implements CanActivate {
  constructor(
    private supabaseService: SupabaseService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    try {
      // Check if user is authenticated
      const { data: sessionData } = await this.supabaseService.getSession();
      
      if (!sessionData.session?.user) {
        this.router.navigate(['/login']);
        return false;
      }

      // Get user profile to check role
      const profile = await this.profileService.getMyProfile();
      
      if (!profile) {
        this.router.navigate(['/role-selection']);
        return false;
      }

      // Check if user is client
      if (profile.role !== 'client') {
        // Redirect to appropriate page based on role
        switch (profile.role) {
          case 'mechanic':
            if (profile.approved) {
              this.router.navigate(['/mechanic']);
            } else {
              this.router.navigate(['/mechanic/pending']);
            }
            break;
          case 'admin':
            this.router.navigate(['/admin']);
            break;
          default:
            this.router.navigate(['/client']);
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Client guard error:', error);
      this.router.navigate(['/login']);
      return false;
    }
  }
}
