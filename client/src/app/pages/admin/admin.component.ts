import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, ShopSettings } from '../../services/settings.service';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-admin',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './admin.component.html',
    styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
    settings: ShopSettings = {
        shop_name: '',
        shop_address: '',
        shop_description: '',
        theme: 'dark',
        tax_mode: 'product',
        bill_layout: 'standard'
    };

    isSaving = false;
    message = '';

    selectedFile: File | null = null;
    isUploading = false;
    uploadMessage = '';

    constructor(
        private settingsService: SettingsService,
        private http: HttpClient
    ) { }

    ngOnInit() {
        this.settingsService.settings$.subscribe(s => {
            this.settings = { ...s };
        });
    }

    saveSettings() {
        this.isSaving = true;
        this.message = '';
        this.settingsService.updateSettings(this.settings).subscribe({
            next: () => {
                this.isSaving = false;
                this.message = 'Settings saved successfully!';
                setTimeout(() => this.message = '', 3000);
            },
            error: (err) => {
                this.isSaving = false;
                this.message = 'Error saving settings.';
                console.error(err);
            }
        });
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
        }
    }

    uploadInventory() {
        if (!this.selectedFile) return;

        this.isUploading = true;
        this.uploadMessage = '';

        const formData = new FormData();
        formData.append('file', this.selectedFile);

        this.http.post<{ message: string }>('/api/products/import', formData).subscribe({
            next: (res) => {
                this.isUploading = false;
                this.uploadMessage = res.message;
                this.selectedFile = null;
            },
            error: (err) => {
                this.isUploading = false;
                this.uploadMessage = err.error?.error || 'Failed to import CSV';
            }
        });
    }
}
