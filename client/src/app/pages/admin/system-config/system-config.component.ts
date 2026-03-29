import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-system-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './system-config.component.html',
  styleUrl: './system-config.component.css'
})
export class SystemConfigComponent implements OnInit {
  activeTab = 'database';
  isSaving = false;
  message = '';

  config: any = {
    db_client: 'sqlite3',
    backup_schedule: 'None',
    backup_email_enabled: 'false'
  };

  backups: any[] = [];
  isBackingUp = false;
  isRestoring = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadConfig();
    this.loadBackups();
  }

  loadConfig() {
    this.http.get<any>('/api/system-config').subscribe({
      next: res => this.config = res,
      error: err => console.error(err)
    });
  }

  saveConfig() {
    this.isSaving = true;
    this.message = '';
    this.http.put('/api/system-config', this.config).subscribe({
      next: () => {
        this.isSaving = false;
        this.message = 'Configuration saved successfully!';
        setTimeout(() => this.message = '', 3000);
      },
      error: err => {
        this.isSaving = false;
        this.message = 'Error saving configuration';
      }
    });
  }

  loadBackups() {
    this.http.get<any[]>('/api/backup-restore/list').subscribe({
      next: res => this.backups = res,
      error: err => console.error('Failed to load backups', err)
    });
  }

  triggerBackup() {
    this.isBackingUp = true;
    this.http.post<any>('/api/backup-restore/create', {}).subscribe({
      next: res => {
        this.isBackingUp = false;
        this.loadBackups();
        alert('Backup successful: ' + res.file);
      },
      error: err => {
        this.isBackingUp = false;
        alert('Backup failed: ' + err.error?.error);
      }
    });
  }

  downloadBackup(filename: string) {
    window.open('/api/backup-restore/download/' + filename, '_blank');
  }

  onRestoreFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('WARNING: Restoring a database will overwrite current data. The server will restart. Proceed?')) {
      return;
    }

    this.isRestoring = true;
    const formData = new FormData();
    formData.append('database', file);

    this.http.post<any>('/api/backup-restore/restore', formData).subscribe({
      next: res => {
        alert(res.message);
        window.location.reload();
      },
      error: err => {
        this.isRestoring = false;
        alert('Restore failed: ' + err.error?.error);
      }
    });
  }
}
