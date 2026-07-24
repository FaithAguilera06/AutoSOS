import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { PdfViewerModule } from 'ng2-pdf-viewer';

@Component({
  selector: 'app-pdf-viewer-modal',
  templateUrl: './pdf-viewer-modal.component.html',
  styleUrls: ['./pdf-viewer-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, PdfViewerModule]
})
export class PdfViewerModalComponent {
  @Input() pdfUrl: string = '';
  @Input() documentName: string = '';
  @Output() closeModal = new EventEmitter<void>();

  pdfSrc: string = '';
  isLoading = true;
  error = false;

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    this.pdfSrc = this.pdfUrl;
  }

  onPdfLoadComplete() {
    this.isLoading = false;
    this.error = false;
  }

  onPdfLoadError(error: any) {
    console.error('PDF load error:', error);
    this.isLoading = false;
    this.error = true;
  }

  close() {
    this.closeModal.emit();
    this.modalController.dismiss();
  }

  downloadPdf() {
    const link = document.createElement('a');
    link.href = this.pdfUrl;
    link.download = this.documentName || 'document.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
