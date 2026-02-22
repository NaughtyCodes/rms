import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';

export interface ShopSettings {
    shop_name: string;
    shop_address: string;
    shop_description: string;
    theme: string;
    tax_mode: string;
    bill_layout: string;
}

const DEFAULT_SETTINGS: ShopSettings = {
    shop_name: 'My Shop',
    shop_address: '123 Main Street',
    shop_description: 'Welcome!',
    theme: 'dark',
    tax_mode: 'product',
    bill_layout: 'standard'
};

@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    private apiUrl = '/api/settings';

    private settingsSubject = new BehaviorSubject<ShopSettings>(DEFAULT_SETTINGS);
    public settings$ = this.settingsSubject.asObservable();

    constructor(private http: HttpClient) {
        this.loadSettings();
    }

    get currentSettings(): ShopSettings {
        return this.settingsSubject.value;
    }

    loadSettings() {
        this.http.get<ShopSettings>(this.apiUrl).subscribe({
            next: (settings) => {
                this.settingsSubject.next(settings);
                this.applyTheme(settings.theme);
            },
            error: (err) => console.error('Failed to load settings', err)
        });
    }

    updateSettings(newSettings: ShopSettings) {
        return this.http.put<{ message: string }>(this.apiUrl, newSettings).pipe(
            tap(() => {
                this.settingsSubject.next({ ...this.currentSettings, ...newSettings });
                if (newSettings.theme) {
                    this.applyTheme(newSettings.theme);
                }
            })
        );
    }

    toggleTheme() {
        const newTheme = this.currentSettings.theme === 'dark' ? 'light' : 'dark';
        this.updateSettings({ ...this.currentSettings, theme: newTheme }).subscribe();
    }

    private applyTheme(theme: string) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }
}
