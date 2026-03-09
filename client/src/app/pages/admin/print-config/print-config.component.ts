import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, ShopSettings } from '../../../services/settings.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-print-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './print-config.component.html',
  styleUrl: './print-config.component.css'
})
export class PrintConfigComponent implements OnInit {
  settings: ShopSettings = {} as ShopSettings;
  isSaving = false;
  message = '';
  today = new Date();

  paperSizes = [
    { value: '80mm', label: '80mm Thermal Receipt' },
    { value: 'a5', label: 'A5 (148 × 210 mm)' },
    { value: 'a4', label: 'A4 (210 × 297 mm)' }
  ];

  layoutStyles = [
    { value: 'modern', label: 'Modern (Design focused)' },
    { value: 'classic', label: 'Classic (Business style)' },
    { value: 'minimal', label: 'Minimal (Clean text)' }
  ];

  layouts = [
    { value: 'standard', label: 'Standard' },
    { value: 'compact', label: 'Compact' }
  ];

  constructor(private settingsService: SettingsService, private http: HttpClient) {}

  ngOnInit() {
    this.settingsService.settings$.subscribe(s => {
      this.settings = { ...s };
    });
  }

  onLogoUploaded(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isSaving = true;
    const formData = new FormData();
    formData.append('logo', file);

    this.http.post<{ logo_url: string }>('/api/settings/upload-logo', formData).subscribe({
      next: (res: { logo_url: string }) => {
        this.settings.shop_logo_url = res.logo_url;
        this.isSaving = false;
        this.message = 'Logo uploaded!';
        setTimeout(() => this.message = '', 3000);
      },
      error: (err: any) => {
        this.isSaving = false;
        this.message = 'Upload failed';
        console.error(err);
      }
    });
  }

  removeLogo() {
    this.settings.shop_logo_url = '';
    this.saveSettings();
  }


  getEncodedUpiId(): string {
    return encodeURIComponent(this.settings.bill_upi_id || '');
  }

  saveSettings() {
    this.isSaving = true;
    this.message = '';
    this.settingsService.updateSettings(this.settings).subscribe({
      next: () => {
        this.isSaving = false;
        this.message = 'Print settings saved!';
        setTimeout(() => this.message = '', 3000);
      },
      error: (err) => {
        this.isSaving = false;
        this.message = 'Error saving settings.';
        console.error(err);
      }
    });
  }

  printPreview() {
    // Open print dialog which allows "Save as PDF"
    const previewEl = document.getElementById('bill-preview');
    if (!previewEl) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const fontFamily = this.settings.font_family || 'Inter';
    const isCompact = this.settings.bill_layout === 'compact';
    const fontSize = isCompact ? '11px' : '13px';
    const headerSize = isCompact ? '16px' : '20px';
    const padding = isCompact ? '16px' : '32px';

    printWindow.document.write(`
      <html>
      <head>
        <title>Bill Preview - ${this.settings.shop_name}</title>
        <link href="https://fonts.googleapis.com/css2?family=${fontFamily}:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: '${fontFamily}', sans-serif; padding: 20px; }
          .receipt { max-width: ${this.settings.bill_paper_size === '80mm' ? '80mm' : this.settings.bill_paper_size === 'a5' ? '148mm' : '210mm'}; margin: 0 auto; padding: ${padding}; font-size: ${fontSize}; }
          .receipt-header { text-align: center; margin-bottom: 16px; border-bottom: 2px dashed #ccc; padding-bottom: 12px; }
          .receipt-header h2 { font-size: ${headerSize}; margin-bottom: 4px; }
          .receipt-header p { font-size: 12px; color: #666; }
          .receipt-meta { font-size: 12px; margin-bottom: 12px; }
          .receipt-meta div { margin-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th, td { padding: 6px; border-bottom: 1px solid #eee; font-size: 12px; text-align: left; }
          th { font-weight: 600; background: #f9f9f9; }
          .totals { border-top: 2px dashed #ccc; padding-top: 8px; }
          .total-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .grand-total { font-size: 18px; font-weight: 700; border-top: 2px solid #333; margin-top: 8px; padding-top: 8px; }
          .footer { text-align: center; margin-top: 16px; padding-top: 12px; border-top: 2px dashed #ccc; color: #888; font-size: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${previewEl.innerHTML}
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}
