import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../admin.service';
import { PdfViewerModalComponent } from './pdf-viewer-modal.component';

@Component({
  selector: 'app-mechanic-detail-popup',
  templateUrl: 'mechanic-detail-popup.component.html',
  styleUrls: ['mechanic-detail-popup.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class MechanicDetailPopupComponent implements OnInit, OnChanges {
  @Input() mechanic: any;
  @Input() isVisible = false;
  @Output() closePopupEvent = new EventEmitter<void>();
  @Output() acceptMechanicEvent = new EventEmitter<void>();
  @Output() declineMechanicEvent = new EventEmitter<void>();
  @Output() changeStatusEvent = new EventEmitter<void>();

  documents: any[] = [];
  isLoadingDocuments = false;
  documentUrls: { [key: string]: string } = {};

  constructor(
    private adminService: AdminService,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    if (this.mechanic?.user_id) {
      this.loadDocuments();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['mechanic'] && changes['mechanic'].currentValue?.user_id) {
      this.loadDocuments();
    }
  }

  async loadDocuments() {
    if (!this.mechanic?.user_id) return;
    
    try {
      this.isLoadingDocuments = true;
      this.documents = await this.adminService.getMechanicDocuments(this.mechanic.user_id);
      
      // Generate signed URLs for each document
      for (const doc of this.documents) {
        try {
          const signedUrl = await this.adminService.getSignedUrlForDocument(doc.file_path);
          this.documentUrls[doc.id] = signedUrl;
        } catch (error) {
          console.error('Error generating signed URL for document:', doc.id, error);
        }
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      this.isLoadingDocuments = false;
    }
  }

  getDocumentUrl(docId: number): string {
    return this.documentUrls[docId] || 'assets/images/placeholder-document.png';
  }

  getDocumentTypeLabel(docType: string): string {
    switch (docType) {
      case 'id_card': return 'Valid ID';
      case 'certificate': return 'NC II Certificate';
      case 'license': return 'License';
      default: return docType;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      case 'submitted': return 'warning';
      default: return 'medium';
    }
  }

  isPdfDocument(docType: string): boolean {
    return docType === 'certificate' || docType === 'license';
  }

  async viewDocument(doc: any) {
    const documentUrl = this.getDocumentUrl(doc.id);
    const documentName = this.getDocumentTypeLabel(doc.doc_type);
    
    if (this.isPdfDocument(doc.doc_type)) {
      // Open PDF in modal
      const modal = await this.modalController.create({
        component: PdfViewerModalComponent,
        componentProps: {
          pdfUrl: documentUrl,
          documentName: documentName
        },
        cssClass: 'pdf-viewer-modal'
      });
      
      await modal.present();
    } else {
      // Open image in new tab
      window.open(documentUrl, '_blank');
    }
  }

  closePopup() {
    this.closePopupEvent.emit();
  }

  acceptMechanic() {
    this.acceptMechanicEvent.emit();
  }

  declineMechanic() {
    this.declineMechanicEvent.emit();
  }

  changeStatus() {
    this.changeStatusEvent.emit();
  }
} 