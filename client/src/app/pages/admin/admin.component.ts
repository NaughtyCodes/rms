import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-admin',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './admin.component.html',
    styleUrl: './admin.component.css'
})
export class AdminComponent {
    selectedFile: File | null = null;
    isUploading = false;
    uploadMessage = '';

    constructor(private http: HttpClient) { }

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
