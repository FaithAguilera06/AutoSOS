import { Component } from '@angular/core';
import { IonicModule, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../supabase.service';
import { ProfileService } from '../profile.service';

@Component({
  selector: 'app-client-registration',
  templateUrl: './client-registration.page.html',
  styleUrls: ['./client-registration.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule, RouterModule]
})
export class ClientRegistrationPage {
  showPassword = false;
  showConfirmPassword = false;
  passwordType = 'password';
  confirmPasswordType = 'password';
  eyeIcon = 'eye-off';
  confirmEyeIcon = 'eye-off';
  isLoading = false;
  
  formData = {
    fullName: '',
    contactNumber: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  constructor(
    private supabase: SupabaseService,
    private profileService: ProfileService,
    private router: Router,
    private alertController: AlertController
  ) { }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
    this.passwordType = this.showPassword ? 'text' : 'password';
    this.eyeIcon = this.showPassword ? 'eye' : 'eye-off';
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
    this.confirmPasswordType = this.showConfirmPassword ? 'text' : 'password';
    this.confirmEyeIcon = this.showConfirmPassword ? 'eye' : 'eye-off';
  }

  async onSubmit() {
    if (this.formData.password !== this.formData.confirmPassword) {
      this.showAlert('Error', 'Passwords do not match!');
      return;
    }

    if (!this.formData.fullName || !this.formData.email || !this.formData.password) {
      this.showAlert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      this.isLoading = true;

      // Create Supabase account
      const { data, error } = await this.supabase.signUpWithEmail(
        this.formData.email, 
        this.formData.password
      );

      if (error) {
        this.showAlert('Registration Failed', error.message);
        return;
      }

      if (data.user) {
        // Update profile with full name, email, phone number, and set role to client
        await this.profileService.updateMyProfile({
          full_name: this.formData.fullName,
          email: this.formData.email,
          phone: this.formData.contactNumber,
          role: 'client'
        });

        this.showAlert('Success', 'Account created successfully! Please check your email to verify your account.');
        this.router.navigate(['/login']);
      }
    } catch (error) {
      console.error('Registration error:', error);
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
} 