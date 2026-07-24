import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { GPT5Service, GPT5DiagnosticRequest, GPT5DiagnosticResponse, DiagnosticContext } from '../../../../services/gpt5.service';
import { Subscription } from 'rxjs';

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: string;
  type: 'user' | 'bot';
  model?: string;
  cost?: number;
  cached?: boolean;
  recommendations?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  immediate_actions?: string[];
  follow_up_questions?: string[];
  isGPT5Response?: boolean;
}

// BotResponse interface removed - now using ChatMessage for all messages

@Component({
  selector: 'app-chatbot',
  templateUrl: 'chatbot.page.html',
  styleUrls: ['chatbot.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, HttpClientModule]
})
export class ChatbotPage implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  userInput = '';
  messages: ChatMessage[] = []; // Single array for all messages
  isTyping = false;
  showQuickActions = true;
  showScrollToBottomButton = false;
  isGPT5Available = false;
  gpt5Error = '';
  userTier: 'free' | 'premium' | 'emergency' = 'free';
  emergencyLevel: 'normal' | 'urgent' | 'critical' = 'normal';
  diagnosticContext: DiagnosticContext = {
    previousDiagnoses: [],
    userTier: 'free',
    emergencyLevel: 'normal',
    yoloDetections: []
  };
  
  private subscriptions: Subscription[] = [];
  
  // Android keyboard handling
  private keyboardHeight = 0;
  private isKeyboardOpen = false;

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

  constructor(
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private gpt5Service: GPT5Service
  ) { }

  ngOnInit() {
    this.initializeGPT5();
    this.setupKeyboardHandling();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.removeKeyboardHandling();
  }

  /**
   * Setup keyboard handling for Android
   */
  private setupKeyboardHandling() {
    // Listen for viewport changes (keyboard open/close)
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleViewportChange.bind(this));
      window.addEventListener('orientationchange', this.handleViewportChange.bind(this));
      
      // Listen for focus events on input
      const inputElement = document.querySelector('ion-textarea');
      if (inputElement) {
        inputElement.addEventListener('focus', this.handleInputFocus.bind(this));
        inputElement.addEventListener('blur', this.handleInputBlur.bind(this));
      }
    }
  }

  /**
   * Remove keyboard handling listeners
   */
  private removeKeyboardHandling() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleViewportChange.bind(this));
      window.removeEventListener('orientationchange', this.handleViewportChange.bind(this));
    }
  }

  /**
   * Handle viewport changes (keyboard open/close)
   */
  private handleViewportChange() {
    setTimeout(() => {
      this.adjustLayoutForKeyboard();
    }, 100);
  }

  /**
   * Handle input focus
   */
  private handleInputFocus() {
    this.isKeyboardOpen = true;
    setTimeout(() => {
      this.adjustLayoutForKeyboard();
    }, 300);
  }

  /**
   * Handle input blur
   */
  private handleInputBlur() {
    this.isKeyboardOpen = false;
    setTimeout(() => {
      this.adjustLayoutForKeyboard();
    }, 300);
  }

  /**
   * Adjust layout for keyboard visibility
   */
  private adjustLayoutForKeyboard() {
    if (typeof window !== 'undefined') {
      const viewportHeight = window.innerHeight;
      const documentHeight = document.documentElement.clientHeight;
      const keyboardHeight = documentHeight - viewportHeight;
      
      this.keyboardHeight = keyboardHeight;
      
      // Ensure send button is visible
      this.ensureSendButtonVisible();
      
      // Scroll to bottom if keyboard is open
      if (this.isKeyboardOpen && keyboardHeight > 0) {
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      }
    }
  }

  /**
   * Ensure send button is visible
   */
  private ensureSendButtonVisible() {
    const sendButton = document.querySelector('.send-button');
    if (sendButton) {
      sendButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Initialize GPT-5 service and check availability
   */
  private initializeGPT5() {
    const gpt5StatusSub = this.gpt5Service.serviceStatus$.subscribe({
      next: (status: 'available' | 'unavailable' | 'checking') => {
        this.isGPT5Available = status === 'available';
        if (status === 'available') {
          console.log('GPT-5 service is available');
          this.gpt5Error = '';
        } else if (status === 'unavailable') {
          this.gpt5Error = 'GPT-5 service is not available. Using fallback responses.';
          console.warn(this.gpt5Error);
        }
      },
      error: (error: any) => {
        this.isGPT5Available = false;
        this.gpt5Error = 'Failed to connect to GPT-5 service. Using fallback responses.';
        console.error('GPT-5 initialization error:', error);
      }
    });
    
    this.subscriptions.push(gpt5StatusSub);
    
    // Check service health
    this.gpt5Service.checkServiceHealth();
  }

  ngAfterViewChecked() {
    // Disable automatic scrolling to allow manual scrolling
    // Only scroll when explicitly requested
  }

  ngAfterViewInit() {
    // Add scroll event listener to show/hide scroll to bottom button
    if (this.chatContainer) {
      this.chatContainer.nativeElement.addEventListener('scroll', () => {
        this.checkScrollPosition();
      });
    }
  }


  /**
   * Check scroll position and show/hide scroll to bottom button
   */
  private checkScrollPosition(): void {
    try {
      if (this.chatContainer && this.chatContainer.nativeElement) {
        const element = this.chatContainer.nativeElement;
        const threshold = 200; // pixels from bottom
        const isNearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - threshold;
        this.showScrollToBottomButton = !isNearBottom;
      }
    } catch (err) {
      console.error('Error checking scroll position:', err);
    }
  }

  /**
   * Send user message
   */
  async sendMessage() {
    if (!this.userInput.trim() || this.isTyping) return;

    // Check if GPT-5 is available before proceeding
    if (!this.isGPT5Available) {
      this.showErrorToast('GPT-5 AI service is not available. Please check your connection and try again.');
      // Don't return early - let the user try again
      return;
    }

    // Ensure send button remains visible after sending
    setTimeout(() => {
      this.ensureSendButtonVisible();
    }, 100);

    const message: ChatMessage = {
      id: Date.now().toString(),
      text: this.userInput.trim(),
      timestamp: this.getCurrentTime(),
      type: 'user'
    };

    this.messages.push(message);
    this.userInput = '';
    this.showQuickActions = false;
    
    // Don't auto-scroll - let user control scrolling

    // Show typing indicator
    this.isTyping = true;
    
    // Set a timeout to ensure typing state is always reset (safety net)
    const typingTimeout = setTimeout(() => {
      if (this.isTyping) {
        console.warn('Typing state reset by timeout - this indicates a potential issue');
        this.isTyping = false;
      }
    }, 30000); // 30 second timeout

    try {
      // Use GPT-5 with intelligent routing
      const gpt5Request: GPT5DiagnosticRequest = {
        user_message: message.text,
        user_tier: this.userTier,
        emergency_level: this.emergencyLevel,
        yolo_detections: this.diagnosticContext.yoloDetections || []
      };

      const gpt5Response = await this.gpt5Service.generateDiagnostic(gpt5Request).toPromise();
      
      if (gpt5Response) {
        const response = this.convertGPT5Response(gpt5Response);
        this.messages.push(response);
        
        // Don't auto-scroll - let user control scrolling
      } else {
        throw new Error('No response received from GPT-5 service');
      }
    } catch (error) {
      console.error('Error generating response:', error);
      
      // Show error message directly in chat
      const errorResponse: ChatMessage = {
        id: Date.now().toString(),
        text: '❌ **Error: Unable to connect to GPT-5 service**\n\nPlease check:\n• Your internet connection\n• GPT-5 service status\n• Try again in a few moments\n\n**Status:** GPT-5 AI service connection failed',
        timestamp: this.getCurrentTime(),
        type: 'bot',
        model: 'error',
        cost: 0,
        cached: false,
        recommendations: ['Check internet connection', 'Verify GPT-5 service is running', 'Try again later'],
        severity: 'low',
        immediate_actions: [],
        follow_up_questions: [],
        isGPT5Response: false
      };
      
      this.messages.push(errorResponse);
      this.showErrorToast('Failed to connect to GPT-5 service. Please try again.');
      
      // Don't auto-scroll - let user control scrolling
    } finally {
      // Clear the timeout and reset typing state
      clearTimeout(typingTimeout);
      this.isTyping = false;
    }
  }

  /**
   * Select quick action
   */
  selectQuickAction(action: string) {
    this.userInput = action;
    this.sendMessage();
  }

  /**
   * Convert GPT-5 response to chatbot format
   */
  private convertGPT5Response(gpt5Response: GPT5DiagnosticResponse): ChatMessage {
    return {
      id: Date.now().toString(),
      text: gpt5Response.response,
      timestamp: this.getCurrentTime(),
      type: 'bot',
      model: gpt5Response.model_used,
      cost: gpt5Response.cost,
      cached: gpt5Response.cached,
      recommendations: gpt5Response.recommendations,
      severity: gpt5Response.severity,
      immediate_actions: gpt5Response.immediate_actions,
      follow_up_questions: [], // GPT-5 doesn't provide follow-up questions in current implementation
      isGPT5Response: true
    };
  }

  /**
   * Get all messages (now just returns the single array)
   */
  getAllMessages(): ChatMessage[] {
    return this.messages;
  }

  /**
   * Format response text for better readability
   */
  formatResponseText(text: string): string {
    if (!text) return '';
    
    // Escape HTML to prevent XSS
    let formattedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Split into lines for better processing
    const lines = formattedText.split('\n');
    const processedLines: string[] = [];
    let inCodeBlock = false;
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (!inCodeBlock) {
          processedLines.push('<pre class="code-block"><code>');
          inCodeBlock = true;
        } else {
          processedLines.push('</code></pre>');
          inCodeBlock = false;
        }
        continue;
      }
      
      if (inCodeBlock) {
        processedLines.push(line);
        continue;
      }
      
      // Handle headers
      if (trimmedLine.startsWith('### ')) {
        processedLines.push(`<h3 class="response-header">${trimmedLine.substring(4)}</h3>`);
        inList = false;
        continue;
      }
      if (trimmedLine.startsWith('## ')) {
        processedLines.push(`<h2 class="response-header">${trimmedLine.substring(3)}</h2>`);
        inList = false;
        continue;
      }
      if (trimmedLine.startsWith('# ')) {
        processedLines.push(`<h1 class="response-header">${trimmedLine.substring(2)}</h1>`);
        inList = false;
        continue;
      }
      
      // Handle lists
      if (trimmedLine.match(/^[\s]*[-*]\s/)) {
        if (!inList) {
          processedLines.push('<ul class="response-list">');
          inList = true;
        }
        const listItem = trimmedLine.replace(/^[\s]*[-*]\s/, '');
        processedLines.push(`<li class="response-list-item">${this.formatInlineText(listItem)}</li>`);
        continue;
      }
      
      if (trimmedLine.match(/^[\s]*\d+\.\s/)) {
        if (!inList) {
          processedLines.push('<ul class="response-list">');
          inList = true;
        }
        const listItem = trimmedLine.replace(/^[\s]*\d+\.\s/, '');
        processedLines.push(`<li class="response-list-item">${this.formatInlineText(listItem)}</li>`);
        continue;
      }
      
      // Close list if we're not in one anymore
      if (inList && trimmedLine !== '') {
        processedLines.push('</ul>');
        inList = false;
      }
      
      // Handle empty lines
      if (trimmedLine === '') {
        if (!inList) {
          processedLines.push('<br>');
        }
        continue;
      }
      
      // Regular paragraph
      processedLines.push(`<p class="response-paragraph">${this.formatInlineText(line)}</p>`);
    }
    
    // Close any open list
    if (inList) {
      processedLines.push('</ul>');
    }
    
    return processedLines.join('');
  }
  
  /**
   * Format inline text (bold, italic, code, etc.)
   */
  private formatInlineText(text: string): string {
    return text
      // Bold text (**text** or __text__)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic text (*text* or _text_)
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Inline code (`code`)
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // Special formatting for diagnostic content
      .replace(/\*\*WARNING:\*\*/g, '<span class="warning-text"><strong>⚠️ WARNING:</strong></span>')
      .replace(/\*\*SUCCESS:\*\*/g, '<span class="success-text"><strong>✅ SUCCESS:</strong></span>')
      .replace(/\*\*ERROR:\*\*/g, '<span class="error-text"><strong>❌ ERROR:</strong></span>')
      .replace(/\*\*IMPORTANT:\*\*/g, '<span class="warning-text"><strong>⚠️ IMPORTANT:</strong></span>')
      .replace(/\*\*DIAGNOSIS:\*\*/g, '<span class="diagnostic-section"><strong>🔍 DIAGNOSIS:</strong></span>')
      .replace(/\*\*SOLUTION:\*\*/g, '<span class="success-text"><strong>🔧 SOLUTION:</strong></span>')
      .replace(/\*\*CAUSE:\*\*/g, '<span class="warning-text"><strong>🔍 CAUSE:</strong></span>')
      .replace(/\*\*SYMPTOMS:\*\*/g, '<span class="diagnostic-section"><strong>📋 SYMPTOMS:</strong></span>')
      // Handle common emojis and symbols
      .replace(/✅/g, '<span class="emoji">✅</span>')
      .replace(/❌/g, '<span class="emoji">❌</span>')
      .replace(/⚠️/g, '<span class="emoji">⚠️</span>')
      .replace(/🔧/g, '<span class="emoji">🔧</span>')
      .replace(/🔍/g, '<span class="emoji">🔍</span>')
      .replace(/📋/g, '<span class="emoji">📋</span>')
      .replace(/💡/g, '<span class="emoji">💡</span>')
      .replace(/🚨/g, '<span class="emoji">🚨</span>');
  }

  /**
   * Simulate typing delay
   */
  private async simulateTyping(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, 1500 + Math.random() * 1000); // 1.5-2.5 seconds
    });
  }

  /**
   * Get current time formatted
   */
  getCurrentTime(): string {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Scroll to bottom of chat
   */
  scrollToBottom(): void {
    try {
      if (this.chatContainer && this.chatContainer.nativeElement) {
        const element = this.chatContainer.nativeElement;
        // Use requestAnimationFrame for smoother scrolling
        requestAnimationFrame(() => {
          element.scrollTop = element.scrollHeight;
          this.showScrollToBottomButton = false;
        });
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  /**
   * Go back to diagnostic page
   */
  goBack() {
    this.router.navigate(['/client/diagnostic']);
  }

  /**
   * Show help information
   */
  async showHelp() {
    const toast = await this.toastController.create({
      message: 'Describe your motorcycle problem in detail for the best diagnosis. Be specific about symptoms, sounds, and when the problem occurs.',
      duration: 4000,
      position: 'bottom',
      color: 'primary'
    });
    await toast.present();
  }

  /**
   * Track by functions for ngFor performance
   */
  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  /**
   * Set user tier for GPT-5 access
   */
  setUserTier(tier: 'free' | 'premium' | 'emergency') {
    this.userTier = tier;
    this.gpt5Service.setUserTier(tier);
  }

  /**
   * Set emergency level
   */
  setEmergencyLevel(level: 'normal' | 'urgent' | 'critical') {
    this.emergencyLevel = level;
    this.gpt5Service.setEmergencyLevel(level);
  }

  /**
   * Update diagnostic context based on user messages
   */
  private updateDiagnosticContext(userMessage: string): void {
    // Update the GPT-5 service context
    this.diagnosticContext = this.gpt5Service.getCurrentContext();
  }

  /**
   * Show error toast
   */
  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'warning'
    });
    await toast.present();
  }

  /**
   * Show user tier selection dialog
   */
  async showUserTierSelection() {
    const alert = await this.alertController.create({
      header: 'Select User Tier',
      message: 'Choose your access level for AI diagnostics:',
      inputs: [
        {
          type: 'radio',
          label: 'Free - Basic diagnostics',
          value: 'free',
          checked: this.userTier === 'free'
        },
        {
          type: 'radio',
          label: 'Premium - Advanced GPT-5 access',
          value: 'premium',
          checked: this.userTier === 'premium'
        },
        {
          type: 'radio',
          label: 'Emergency - Priority access',
          value: 'emergency',
          checked: this.userTier === 'emergency'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Select',
          handler: (selectedTier) => {
            if (selectedTier) {
              this.setUserTier(selectedTier);
              this.showSuccessToast(`User tier changed to: ${selectedTier}`);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Show success toast
   */
  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }

  /**
   * Retry GPT-5 connection
   */
  async retryGPT5Connection() {
    const loading = await this.loadingController.create({
      message: 'Checking GPT-5 connection...',
      duration: 5000
    });
    await loading.present();

    this.gpt5Service.checkServiceHealth();
    
    setTimeout(async () => {
      await loading.dismiss();
      if (this.isGPT5Available) {
        this.showSuccessToast('GPT-5 connection restored!');
      } else {
        this.showErrorToast('Still unable to connect to GPT-5 service');
      }
    }, 3000);
  }
} 