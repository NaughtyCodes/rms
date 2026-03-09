import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';

export interface ShopSettings {
    shop_name: string;
    shop_address: string;
    shop_description: string;
    shop_phone: string;
    shop_email: string;
    shop_gstin: string;
    shop_logo_url: string;
    theme: string;
    tax_mode: string;
    bill_layout: string;
    bill_layout_style: string;
    bill_paper_size: string;
    bill_show_logo: string;
    bill_footer_text: string;
    bill_watermark_text: string;
    bill_watermark_opacity: string;
    bill_show_watermark: string;
    bill_terms: string;
    bill_show_qr: string;
    bill_upi_id: string;
    font_family: string;
}

const DEFAULT_SETTINGS: ShopSettings = {
    shop_name: 'My Shop',
    shop_address: '123 Main Street',
    shop_description: 'Welcome!',
    shop_phone: '',
    shop_email: '',
    shop_gstin: '',
    shop_logo_url: '',
    theme: 'light',
    tax_mode: 'product',
    bill_layout: 'standard',
    bill_layout_style: 'modern',
    bill_paper_size: '80mm',
    bill_show_logo: 'false',
    bill_footer_text: 'Thank you for shopping with us!',
    bill_watermark_text: 'PAID',
    bill_watermark_opacity: '0.1',
    bill_show_watermark: 'false',
    bill_terms: '',
    bill_show_qr: 'false',
    bill_upi_id: '',
    font_family: 'Inter'
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
                this.applySettings(settings);
            },
            error: (err) => console.error('Failed to load settings', err)
        });
    }

    updateSettings(newSettings: ShopSettings) {
        return this.http.put<{ message: string }>(this.apiUrl, newSettings).pipe(
            tap(() => {
                const merged = { ...this.currentSettings, ...newSettings };
                this.settingsSubject.next(merged);
                this.applySettings(merged);
            })
        );
    }

    toggleTheme() {
        const newTheme = this.currentSettings.theme === 'dark' ? 'light' : 'dark';
        this.updateSettings({ ...this.currentSettings, theme: newTheme }).subscribe();
    }

    private applySettings(settings: ShopSettings) {
        // Apply theme
        if (settings.theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        // Apply font family
        const fontMap: { [key: string]: string } = {
            'Inter': "'Inter', -apple-system, sans-serif",
            'Roboto': "'Roboto', -apple-system, sans-serif",
            'Outfit': "'Outfit', -apple-system, sans-serif"
        };
        const fontValue = fontMap[settings.font_family] || fontMap['Inter'];
        document.documentElement.style.setProperty('--font-family', fontValue);
    }
}
