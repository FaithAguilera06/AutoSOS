import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientDetailPopupComponent } from './client-detail-popup.component';
import { AdminService } from '../../../admin.service';
import type { Profile } from '../../../models';

@Component({
  selector: 'app-client',
  templateUrl: 'client.page.html',
  styleUrls: ['client.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ClientDetailPopupComponent]
})
export class ClientPage implements OnInit {
  constructor(
    private router: Router,
    private adminService: AdminService,
    private alertController: AlertController
  ) {}
  
  selectedClient: Profile | null = null;
  showPopup = false;
  clients: Profile[] = [];
  searchTerm = '';
  filteredClients: Profile[] = [];
  isLoading = true;

  async ngOnInit() {
    await this.loadClients();
  }

  async loadClients() {
    try {
      this.isLoading = true;
      this.clients = await this.adminService.getAllClients();
      this.filteredClients = this.clients;
    } catch (error) {
      console.error('Error loading clients:', error);
      await this.showAlert('Error', 'Failed to load clients');
    } finally {
      this.isLoading = false;
    }
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    this.filterClients();
  }

  filterClients() {
    if (!this.searchTerm) {
      this.filteredClients = this.clients;
    } else {
      this.filteredClients = this.clients.filter(client =>
        (client.full_name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ?? false) ||
        client.user_id.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  viewClient(userId: string) {
    const client = this.clients.find(c => c.user_id === userId);
    if (client) {
      this.selectedClient = client;
      this.showPopup = true;
    }
  }

  async deleteClient(userId: string) {
    const alert = await this.alertController.create({
      header: 'Delete Client',
      message: 'Are you sure you want to delete this client? This action cannot be undone.',
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
              await this.loadClients();
              await this.showAlert('Success', 'Client deleted successfully');
            } catch (error) {
              console.error('Error deleting client:', error);
              await this.showAlert('Error', 'Failed to delete client');
            }
          }
        }
      ]
    });
    await alert.present();
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