import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

export interface Diagnosis {
  id: string;
  title: string;
  date: string;
  summary: string;
  type: 'chatbot' | 'camera';
  status: 'Completed' | 'Pending' | 'Processing';
}

@Component({
  selector: 'app-diagnostic',
  templateUrl: 'diagnostic.page.html',
  styleUrls: ['diagnostic.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class DiagnosticPage implements OnInit {
  isChildRoute = false;
  
  recentDiagnoses: Diagnosis[] = [
    {
      id: '1',
      title: 'Engine Noise Analysis',
      date: 'July 25, 2025',
      summary: 'Detected unusual engine noise - recommended brake system check',
      type: 'chatbot',
      status: 'Completed'
    },
    {
      id: '2',
      title: 'Brake System Visual Check',
      date: 'July 20, 2025',
      summary: 'AR analysis identified worn brake pads requiring replacement',
      type: 'camera',
      status: 'Completed'
    },
    {
      id: '3',
      title: 'Electrical System Diagnostic',
      date: 'July 18, 2025',
      summary: 'Battery voltage issues detected - charging system check needed',
      type: 'chatbot',
      status: 'Pending'
    }
  ];

  constructor(
    private router: Router,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    // Initialize component
    this.loadRecentDiagnoses();
    
    // Check if we're on a child route
    this.isChildRoute = this.router.url.includes('/chatbot') || this.router.url.includes('/camera');
    
    // Don't auto-navigate - let user choose between camera and chatbot
  }

  /**
   * Load recent diagnoses from service or storage
   */
  async loadRecentDiagnoses() {
    try {
      // In a real app, you would load from a service
      console.log('Recent diagnoses loaded:', this.recentDiagnoses);
    } catch (error) {
      console.error('Error loading recent diagnoses:', error);
    }
  }

  /**
   * Navigate to chatbot diagnostic
   */
  navigateToChatbot() {
    this.router.navigate(['/client/diagnostic/chatbot']);
  }

  /**
   * Navigate to camera diagnostic
   */
  navigateToCamera() {
    this.router.navigate(['/client/diagnostic/camera']);
  }

  /**
   * View a specific diagnosis
   */
  viewDiagnosis(diagnosis: Diagnosis) {
    // Navigate to diagnosis details
    this.router.navigate(['/client/diagnostic/details', diagnosis.id]);
  }

  /**
   * Show help information
   */
  async showHelp() {
    const toast = await this.toastController.create({
      message: 'Diagnostic help information will be displayed here',
      duration: 3000,
      position: 'bottom',
      color: 'primary'
    });
    await toast.present();
  }

  /**
   * Contact support
   */
  async contactSupport() {
    const toast = await this.toastController.create({
      message: 'Redirecting to support...',
      duration: 3000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }

  /**
   * Track by function for ngFor performance
   */
  trackByDiagnosisId(index: number, diagnosis: Diagnosis): string {
    return diagnosis.id;
  }
} 