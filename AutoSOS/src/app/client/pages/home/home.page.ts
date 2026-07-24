import { Component, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonModal } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../supabase.service';
import { ProfileService } from '../../../profile.service';
import type { Profile } from '../../../models';

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: string;
}

export interface BotResponse {
  id: string;
  text: string;
  timestamp: string;
  diagnosis?: {
    issue: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    recommendation: string;
  };
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class HomePage implements OnInit, AfterViewChecked {
  @ViewChild('diagnosticModal') diagnosticModal!: IonModal;
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  
  userName = 'Loading...';
  userEmail = 'Loading...';
  profile: Profile | null = null;
  isDiagnosticModalOpen = false;
  isChatbotOpen = false;
  isCameraModalOpen = false;
  
  // Chatbot properties
  userInput = '';
  chatMessages: ChatMessage[] = [];
  botResponses: BotResponse[] = [];
  isTyping = false;
  showQuickActions = true;

  quickActions = [
    'Engine won\'t start',
    'Brake problems',
    'Electrical issues',
    'Engine noise',
    'Oil leak',
    'Battery dead',
    'Tire problems',
    'Clutch issues'
  ];

  // Mock AI responses based on keywords
  private aiResponses = {
    'engine': {
      text: 'I understand you\'re having engine issues. Let me analyze this for you.',
      diagnosis: {
        issue: 'Engine Performance Problem',
        severity: 'Medium' as const,
        recommendation: 'Check fuel system, spark plugs, and air filter. Consider professional inspection if problem persists.'
      }
    },
    'brake': {
      text: 'Brake issues are critical for safety. Let me help you diagnose this.',
      diagnosis: {
        issue: 'Brake System Problem',
        severity: 'High' as const,
        recommendation: 'Immediately check brake fluid level, brake pads, and brake lines. Do not ride until resolved.'
      }
    },
    'electrical': {
      text: 'Electrical problems can affect multiple systems. Let me analyze this.',
      diagnosis: {
        issue: 'Electrical System Issue',
        severity: 'Medium' as const,
        recommendation: 'Check battery connections, fuses, and wiring. Test battery voltage and charging system.'
      }
    },
    'noise': {
      text: 'Engine noise can indicate various problems. Let me help identify the cause.',
      diagnosis: {
        issue: 'Engine Noise',
        severity: 'Medium' as const,
        recommendation: 'Identify noise type (knocking, rattling, whining). Check oil level and quality. Consider valve adjustment.'
      }
    },
    'oil': {
      text: 'Oil leaks can lead to serious engine damage. Let me help you address this.',
      diagnosis: {
        issue: 'Oil Leak',
        severity: 'High' as const,
        recommendation: 'Locate leak source. Check oil level and quality. Repair leak immediately to prevent engine damage.'
      }
    },
    'battery': {
      text: 'Battery issues can prevent starting and affect electrical systems.',
      diagnosis: {
        issue: 'Battery Problem',
        severity: 'Medium' as const,
        recommendation: 'Check battery voltage and connections. Test charging system. Replace battery if necessary.'
      }
    },
    'tire': {
      text: 'Tire problems affect safety and handling. Let me help you assess this.',
      diagnosis: {
        issue: 'Tire Issue',
        severity: 'High' as const,
        recommendation: 'Check tire pressure, tread depth, and for damage. Replace tires if worn or damaged.'
      }
    },
    'clutch': {
      text: 'Clutch problems affect gear shifting and control. Let me analyze this.',
      diagnosis: {
        issue: 'Clutch Problem',
        severity: 'Medium' as const,
        recommendation: 'Check clutch cable adjustment and fluid level. Test clutch engagement and disengagement.'
      }
    }
  };
  
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
      // Get current session
      const { data: sessionData } = await this.supabase.getSession();
      if (sessionData.session?.user) {
        this.userEmail = sessionData.session.user.email || '';
      }

      // Get profile data
      this.profile = await this.profileService.getMyProfile();
      if (this.profile) {
        this.userName = this.profile.full_name || 'User';
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.userName = 'User';
      this.userEmail = 'Unknown';
    }
  }
  
  ngAfterViewChecked() {
    this.scrollToBottom();
  }
  
  openDiagnosticModal() {
    // Navigate to diagnostic page to choose between camera and chatbot
    this.router.navigate(['/client/diagnostic']);
  }
  
  closeDiagnosticModal() {
    this.isDiagnosticModalOpen = false;
  }
  
  closeCameraModal() {
    this.isCameraModalOpen = false;
  }

  openCameraDiagnostic() {
    // Navigate directly to camera diagnostic
    this.router.navigate(['/client/diagnostic/camera']);
  }
  
  toggleChatbot() {
    this.isChatbotOpen = !this.isChatbotOpen;
    console.log('Chatbot toggled:', this.isChatbotOpen);
    if (this.isChatbotOpen) {
      // Add a small delay to ensure smooth animation
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    }
  }
  
  navigateToCamera() {
    // Navigate directly to camera diagnostic instead of showing modal
    this.router.navigate(['/client/diagnostic/camera']);
  }
  
  navigateToMechanicFinder() {
    this.router.navigate(['/client/mechanic-finder']);
  }
  
  // Chatbot methods
  async sendMessage() {
    if (!this.userInput.trim() || this.isTyping) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      text: this.userInput.trim(),
      timestamp: this.getCurrentTime()
    };

    this.chatMessages.push(message);
    this.userInput = '';
    this.showQuickActions = false;

    // Simulate AI processing
    this.isTyping = true;
    
    // Set a timeout to ensure typing state is always reset (safety net)
    const typingTimeout = setTimeout(() => {
      if (this.isTyping) {
        console.warn('Typing state reset by timeout - this indicates a potential issue');
        this.isTyping = false;
      }
    }, 10000); // 10 second timeout for home page
    
    try {
      await this.simulateTyping();

      // Generate AI response
      const response = this.generateAIResponse(message.text);
      this.botResponses.push(response);
    } catch (error) {
      console.error('Error in chatbot:', error);
      // Add error message to chat
      const errorResponse: BotResponse = {
        id: Date.now().toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: this.getCurrentTime(),
        diagnosis: {
          issue: 'Connection Error',
          severity: 'Low',
          recommendation: 'Try rephrasing your question or check your connection'
        }
      };
      this.botResponses.push(errorResponse);
    } finally {
      // Clear the timeout and reset typing state
      clearTimeout(typingTimeout);
      this.isTyping = false;
    }
  }

  selectQuickAction(action: string) {
    this.userInput = action;
    this.sendMessage();
  }

  private generateAIResponse(userInput: string): BotResponse {
    const input = userInput.toLowerCase();
    let response: BotResponse;

    // Check for keywords in user input
    for (const [keyword, aiResponse] of Object.entries(this.aiResponses)) {
      if (input.includes(keyword)) {
        response = {
          id: Date.now().toString(),
          text: aiResponse.text,
          timestamp: this.getCurrentTime(),
          diagnosis: aiResponse.diagnosis
        };
        return response;
      }
    }

    // Default response if no specific keywords found
    response = {
      id: Date.now().toString(),
      text: 'I understand you\'re having motorcycle issues. Could you please provide more specific details about the problem you\'re experiencing? This will help me give you a more accurate diagnosis.',
      timestamp: this.getCurrentTime()
    };

    return response;
  }

  private async simulateTyping(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, 1500 + Math.random() * 1000); // 1.5-2.5 seconds
    });
  }

  getCurrentTime(): string {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  trackByResponseId(index: number, response: BotResponse): string {
    return response.id;
  }
} 