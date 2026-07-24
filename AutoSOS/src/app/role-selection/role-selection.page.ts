import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-role-selection',
  templateUrl: './role-selection.page.html',
  styleUrls: ['./role-selection.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule, RouterModule]
})
export class RoleSelectionPage {
  selectedRole: string = '';

  constructor(private router: Router) { }

  selectRole(role: string) {
    this.selectedRole = role;
    
    // Navigate directly based on selected role
    if (role === 'mechanic') {
      this.router.navigate(['/mechanic-registration']);
    } else if (role === 'client') {
      this.router.navigate(['/client-registration']);
    }
  }
} 