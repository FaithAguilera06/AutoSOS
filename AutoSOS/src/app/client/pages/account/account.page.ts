import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../supabase.service';
import { ProfileService } from '../../../profile.service';
import type { Profile } from '../../../models';

@Component({
  selector: 'app-account',
  templateUrl: 'account.page.html',
  styleUrls: ['account.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class AccountPage implements OnInit {
  profile: Profile | null = null;
  userEmail = '';
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
      
      // Get current session
      const { data: sessionData } = await this.supabase.getSession();
      if (sessionData.session?.user) {
        this.userEmail = sessionData.session.user.email || '';
      }

      // Get profile data
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
}