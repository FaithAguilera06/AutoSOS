import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MechanicDetailPopupComponent } from './mechanic-detail-popup.component';
import { AdminService } from '../../../admin.service';
import type { Profile } from '../../../models';

@Component({
  selector: 'app-mechanic',
  templateUrl: 'mechanic.page.html',
  styleUrls: ['mechanic.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, MechanicDetailPopupComponent]
})
export class MechanicPage implements OnInit {
  constructor(
    private router: Router,
    private adminService: AdminService,
    private alertController: AlertController
  ) {}
  
  mechanics: Profile[] = [];
  searchTerm = '';
  filteredMechanics: Profile[] = [];
  showPopup = false;
  selectedMechanic: Profile | null = null;
  isLoading = true;
  activeTab = 'all'; // 'all', 'pending', 'approved'

  async ngOnInit() {
    await this.loadMechanics();
  }

  async loadMechanics() {
    try {
      this.isLoading = true;
      this.mechanics = await this.adminService.getAllMechanics();
      this.filteredMechanics = this.mechanics;
    } catch (error) {
      console.error('Error loading mechanics:', error);
      await this.showAlert('Error', 'Failed to load mechanics');
    } finally {
      this.isLoading = false;
    }
  }

  onSegmentChange(event: any) {
    const value = event.detail.value;
    if (value === 'all' || value === 'pending' || value === 'approved') {
      this.loadMechanicsByStatus(value);
    }
  }

  async loadMechanicsByStatus(status: 'all' | 'pending' | 'approved') {
    try {
      this.isLoading = true;
      this.activeTab = status;
      
      switch (status) {
        case 'all':
          this.mechanics = await this.adminService.getAllMechanics();
          break;
        case 'pending':
          this.mechanics = await this.adminService.listMechanicsPendingApproval();
          break;
        case 'approved':
          this.mechanics = await this.adminService.listMechanicsApproved();
          break;
      }
      
      this.filteredMechanics = this.mechanics;
    } catch (error) {
      console.error('Error loading mechanics:', error);
      await this.showAlert('Error', 'Failed to load mechanics');
    } finally {
      this.isLoading = false;
    }
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    this.filterMechanics();
  }

  filterMechanics() {
    if (!this.searchTerm) {
      this.filteredMechanics = this.mechanics;
    } else {
      this.filteredMechanics = this.mechanics.filter(mechanic =>
        (mechanic.full_name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ?? false) ||
        mechanic.user_id.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        mechanic.specialization.some(spec => spec.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );
    }
  }

  viewMechanic(userId: string) {
    this.selectedMechanic = this.mechanics.find(m => m.user_id === userId) || null;
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
    this.selectedMechanic = null;
  }

  async approveMechanic(userId: string) {
    try {
      await this.adminService.approveMechanic(userId);
      await this.loadMechanics();
      await this.showAlert('Success', 'Mechanic approved successfully');
    } catch (error) {
      console.error('Error approving mechanic:', error);
      await this.showAlert('Error', 'Failed to approve mechanic');
    }
  }

  async rejectMechanic(userId: string) {
    const alert = await this.alertController.create({
      header: 'Reject Mechanic',
      message: 'Are you sure you want to reject this mechanic? They will need to reapply.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reject',
          role: 'destructive',
          handler: async () => {
            try {
              await this.adminService.rejectMechanic(userId);
              await this.loadMechanics();
              await this.showAlert('Success', 'Mechanic rejected');
            } catch (error) {
              console.error('Error rejecting mechanic:', error);
              await this.showAlert('Error', 'Failed to reject mechanic');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteMechanic(userId: string) {
    const alert = await this.alertController.create({
      header: 'Delete Mechanic',
      message: 'Are you sure you want to delete this mechanic? This action cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.adminService.deleteUser(userId);
              await this.loadMechanics();
              await this.showAlert('Success', 'Mechanic deleted successfully');
            } catch (error) {
              console.error('Error deleting mechanic:', error);
              await this.showAlert('Error', 'Failed to delete mechanic');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  getStatusColor(approved: boolean): string {
    return approved ? 'success' : 'warning';
  }

  getStatusText(approved: boolean): string {
    return approved ? 'Approved' : 'Pending';
  }

  async acceptMechanic() {
    if (this.selectedMechanic) {
      await this.approveMechanic(this.selectedMechanic.user_id);
      this.closePopup();
    }
  }

  async declineMechanic() {
    if (this.selectedMechanic) {
      await this.rejectMechanic(this.selectedMechanic.user_id);
      this.closePopup();
    }
  }

  async changeStatus() {
    if (this.selectedMechanic) {
      if (this.selectedMechanic.approved) {
        // If approved, we could implement a way to revoke approval
        await this.showAlert('Info', 'Mechanic is already approved');
      } else {
        await this.approveMechanic(this.selectedMechanic.user_id);
      }
      this.closePopup();
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