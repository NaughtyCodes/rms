import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, ShopSettings } from '../../../services/settings.service';

@Component({
  selector: 'app-shop-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shop-config.component.html',
  styleUrl: './shop-config.component.css'
})
export class ShopConfigComponent implements OnInit {
  settings: ShopSettings = {} as ShopSettings;
  isSaving = false;
  message = '';

  fontOptions = [
    { value: 'Inter', label: 'Inter (Default)' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Outfit', label: 'Outfit' }
  ];

  constructor(private settingsService: SettingsService) {}

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
}
