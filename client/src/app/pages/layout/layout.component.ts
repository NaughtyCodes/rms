import { Component, HostListener } from '@angular/core';
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
    mobileMenuOpen = false;
    isScrolled = false;
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
        const role = this.auth.getUser()?.role;
        if (role === 'admin' || role === 'superadmin') {
            this.navItems.push({
                path: '/admin',
                icon: '⚙️',
                label: 'Admin Settings',
                children: [
                    { path: '/inventory', icon: '📦', label: 'Inventory' },
                    { path: '/admin/stock-management', icon: '🔄', label: 'Stock Mgmt' },
                    { path: '/admin/branches', icon: '🏢', label: 'Branches' },
                    { path: '/admin/transfers', icon: '🚚', label: 'Transfers' },
                    { path: '/admin/meta-setup', icon: '📝', label: 'Meta Setup' },
                    { path: '/admin/taxes', icon: '💰', label: 'Tax Settings' },
                    { path: '/admin/discounts', icon: '🏷️', label: 'Discounts' },
                    { path: '/admin/shop-config', icon: '🏪', label: 'Shop Config' },
                    { path: '/admin/print-config', icon: '🖨️', label: 'Print Config' },
                    { path: '/admin/test-results', icon: '🧪', label: 'Test Results' }
                ]
            });
        }

        if (this.auth.isSuperAdmin()) {
            this.navItems.push({
                path: '/superadmin/tenants',
                icon: '🏢',
                label: 'Tenant Mgmt'
            });
        }
    }

    @HostListener('window:scroll', [])
    onWindowScroll() {
        this.isScrolled = window.scrollY > 0;
    }

    onContentScroll(event: Event) {
        const target = event.target as HTMLElement;
        this.isScrolled = target.scrollTop > 0;
    }

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        if (this.mobileMenuOpen) {
            this.mobileMenuOpen = false;
        }
    }

    toggleMobileMenu() {
        this.mobileMenuOpen = !this.mobileMenuOpen;
    }

    closeMobileMenu() {
        this.mobileMenuOpen = false;
    }

    toggleTheme() {
        this.settingsService.toggleTheme();
    }

    getUserInitial(): string {
        const name = this.auth.getUser()?.fullName || this.auth.getUser()?.username || 'U';
        return name.charAt(0).toUpperCase();
    }
}
