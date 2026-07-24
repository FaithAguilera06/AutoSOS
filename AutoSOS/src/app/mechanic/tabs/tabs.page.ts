import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class TabsPage {
  constructor(private router: Router, private route: ActivatedRoute) {}

  navigateTo(path: string) {
    // Try using navigateByUrl for more direct navigation
    console.log('Navigating to:', path);
    console.log('Current URL:', this.router.url);
    console.log('Available routes:', this.router.config);
    
    // Use navigateByUrl to navigate directly to the path
    this.router.navigateByUrl(`/mechanic/${path}`);
  }

  isActive(path: string): boolean {
    // Check if the current route matches the path
    const currentUrl = this.router.url;
    
    return currentUrl.includes(path);
  }
} 