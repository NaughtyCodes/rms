import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './layout.component.html',
    styleUrl: './layout.component.css'
})
export class LayoutComponent {
    sidebarCollapsed = false;
    today = new Date();

    navItems: any[] = [
        { path: '/dashboard', icon: '📊', label: 'Dashboard' },
        { path: '/billing', icon: '🧾', label: 'New Bill' },
        { path: '/invoices', icon: '📋', label: 'Invoices' },
        { path: '/reports', icon: '📈', label: 'Reports' },
    ];

    constructor(
        public auth: AuthService,
        public settingsService: SettingsService
    ) {
        if (this.auth.getUser()?.role === 'admin') {
            this.navItems.push({
                path: '/admin',
                icon: '⚙️',
                label: 'Admin Settings',
                children: [
                    { path: '/inventory', icon: '📦', label: 'Inventory' },
                    { path: '/admin/stock-management', icon: '🔄', label: 'Stock Mgmt' },
                    { path: '/admin/meta-setup', icon: '📝', label: 'Meta Setup' },
                    { path: '/admin/taxes', icon: '💰', label: 'Tax Settings' },
                    { path: '/admin/discounts', icon: '🏷️', label: 'Discounts' },
                    { path: '/admin/shop-config', icon: '🏪', label: 'Shop Config' },
                    { path: '/admin/print-config', icon: '🖨️', label: 'Print Config' }
                ]
            });
        }
    }

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
    }

    toggleTheme() {
        this.settingsService.toggleTheme();
    }
}
