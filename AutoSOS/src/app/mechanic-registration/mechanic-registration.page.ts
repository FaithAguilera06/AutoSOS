import { Component } from '@angular/core';
import { IonicModule, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../supabase.service';
import { ProfileService } from '../profile.service';
import { MechanicDocsService } from '../mechanic-docs.service';

@Component({
  selector: 'app-mechanic-registration',
  templateUrl: './mechanic-registration.page.html',
  styleUrls: ['./mechanic-registration.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule, RouterModule]
})
export class MechanicRegistrationPage {
  showPassword = false;
  showConfirmPassword = false;
  passwordType = 'password';
  confirmPasswordType = 'password';
  eyeIcon = 'eye-off';
  confirmEyeIcon = 'eye-off';
  isLoading = false;
  
  validIdFile: File | null = null;
  certificateFile: File | null = null;
  
  formData = {
    fullName: '',
    contactNumber: '',
    email: '',
    skills: '',
    password: '',
    confirmPassword: ''
  };

  constructor(
    private supabase: SupabaseService,
    private profileService: ProfileService,
    private mechanicDocsService: MechanicDocsService,
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

  triggerValidIdUpload() {
    const fileInput = document.getElementById('validId') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  triggerCertificateUpload() {
    const fileInput = document.getElementById('certificate') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onValidIdChange(event: any) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.validIdFile = file;
    } else {
      this.showAlert('Error', 'Please select a valid image file.');
    }
  }

  onCertificateChange(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.certificateFile = file;
    } else {
      this.showAlert('Error', 'Please select a valid PDF file.');
    }
  }

  async onSubmit() {
    if (this.formData.password !== this.formData.confirmPassword) {
      this.showAlert('Error', 'Passwords do not match!');
      return;
    }

    if (!this.validIdFile) {
      this.showAlert('Error', 'Please upload a valid ID picture.');
      return;
    }

    if (!this.certificateFile) {
      this.showAlert('Error', 'Please upload your NC II certificate.');
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
        // Wait a moment for the user session to be established
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Parse skills into array
        const skillsArray = this.formData.skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
        
        // Update profile with full name, email, role, and specializations
        try {
          await this.profileService.updateMyProfile({
            full_name: this.formData.fullName,
            email: this.formData.email,
            role: 'mechanic',
            specialization: skillsArray
          });
          console.log('Profile updated successfully');
        } catch (profileError) {
          console.error('Profile update error:', profileError);
          this.showAlert('Error', 'Failed to update profile. Please try again.');
          return;
        }

        // Upload documents with retry logic
        try {
          console.log('Starting document uploads...');
          await this.mechanicDocsService.uploadDocument(this.validIdFile!, 'id_card');
          console.log('ID card uploaded successfully');
          
          await this.mechanicDocsService.uploadDocument(this.certificateFile!, 'certificate');
          console.log('Certificate uploaded successfully');
        } catch (uploadError) {
          console.error('Document upload error:', uploadError);
          this.showAlert('Warning', 'Account created but document upload failed. Please contact support.');
          this.router.navigate(['/login']);
          return;
        }

        this.showAlert('Success', 'Registration submitted successfully! Your account is pending admin approval.');
        this.router.navigate(['/login']);
      }
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'An unexpected error occurred';
      
      if (error instanceof Error) {
        if (error.message.includes('Bucket not found')) {
          errorMessage = 'Storage service is not configured. Please contact support.';
        } else if (error.message.includes('NavigatorLockAcquireTimeoutError')) {
          errorMessage = 'Authentication timeout. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      this.showAlert('Error', errorMessage);
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