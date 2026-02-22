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

    navItems = [
        { path: '/dashboard', icon: '📊', label: 'Dashboard' },
        { path: '/billing', icon: '🧾', label: 'New Bill' },
        { path: '/invoices', icon: '📋', label: 'Invoices' },
        { path: '/inventory', icon: '📦', label: 'Inventory' },
        { path: '/reports', icon: '📈', label: 'Reports' },
    ];

    constructor(
        public auth: AuthService,
        public settingsService: SettingsService
    ) {
        if (this.auth.getUser()?.role === 'admin') {
            this.navItems.push({ path: '/admin', icon: '⚙️', label: 'Admin Settings' });
        }
    }

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
    }

    toggleTheme() {
        this.settingsService.toggleTheme();
    }
}
