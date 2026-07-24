import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../supabase.service';
import { ProfileService } from '../../../profile.service';
import type { Profile } from '../../../models';

@Component({
  selector: 'app-pending',
  templateUrl: 'pending.page.html',
  styleUrls: ['pending.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class PendingPage implements OnInit {
  profile: Profile | null = null;
  isLoading = true;

  constructor(
    private router: Router,
    private supabase: SupabaseService,
    private profileService: ProfileService
  ) {}

  async ngOnInit() {
    await this.loadUserData();
  }

  async loadUserData() {
    try {
      this.isLoading = true;
      this.profile = await this.profileService.getMyProfile();
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }

  async checkStatus() {
    await this.loadUserData();
    if (this.profile?.approved) {
      this.router.navigate(['/mechanic']);
    }
  }
}

