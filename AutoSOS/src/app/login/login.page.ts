import { Component } from '@angular/core';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../supabase.service';
import { ProfileService } from '../profile.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class LoginPage {
  email: string = '';
  password: string = '';
  isLoading = false;

  constructor(
    private router: Router,
    private supabase: SupabaseService,
    private profileService: ProfileService,
    private alertController: AlertController
  ) {}

  async login() {
    if (!this.email || !this.password) {
      this.showAlert('Error', 'Please enter both email and password');
      return;
    }

    try {
      this.isLoading = true;
      
      const { data, error } = await this.supabase.signInWithEmail(this.email, this.password);
      
      if (error) {
        this.showAlert('Login Failed', error.message);
        return;
      }

      if (data.user) {
        // Get user profile to determine role
        const profile = await this.profileService.getMyProfile();
        
        if (profile) {
          // Navigate based on role and approval status
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
            case 'admin':
              this.router.navigate(['/admin']);
              break;
            default:
              this.router.navigate(['/client']);
          }
        } else {
          // No profile found, redirect to role selection
          this.router.navigate(['/role-selection']);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showAlert('Error', 'An unexpected error occurred');
    } finally {
      this.isLoading = false;
    }
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  goToRegistration() {
    this.router.navigate(['/role-selection']);
  }
} 