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

    navItems: any[] = [];

    constructor(
        public auth: AuthService,
        public settingsService: SettingsService
    ) {
        // Base navigation items based on generic permissions
        if (this.auth.hasPermission('view_dashboard') || this.auth.isAdmin()) {
            this.navItems.push({ path: '/dashboard', icon: '📊', label: 'Dashboard' });
        }
        if (this.auth.hasPermission('access_billing') || this.auth.isAdmin()) {
            this.navItems.push({ path: '/billing', icon: '🧾', label: 'New Bill' });
        }
        if (this.auth.hasPermission('view_invoices') || this.auth.isAdmin()) {
            this.navItems.push({ path: '/invoices', icon: '📋', label: 'Invoices' });
        }
        if (this.auth.hasPermission('view_sales_reports') || this.auth.isAdmin()) {
            this.navItems.push({ path: '/reports', icon: '📈', label: 'Reports' });
        }

        const adminChildren: any[] = [];
        if (this.auth.hasPermission('manage_users') || this.auth.isAdmin()) {
            adminChildren.push({ path: '/admin/users', icon: '👥', label: 'Users' });
        }
        if (this.auth.hasPermission('manage_roles') || this.auth.isAdmin()) {
            adminChildren.push({ path: '/admin/roles', icon: '🔐', label: 'Roles & Perms' });
        }
        if (this.auth.hasPermission('view_inventory') || this.auth.hasPermission('manage_inventory') || this.auth.isAdmin()) {
            adminChildren.push({ path: '/inventory', icon: '📦', label: 'Inventory' });
        }
        if (this.auth.hasPermission('manage_inventory') || this.auth.isAdmin()) {
            adminChildren.push({ path: '/admin/stock-management', icon: '🔄', label: 'Stock Mgmt' });
        }
        if (this.auth.hasPermission('manage_branches') || this.auth.isAdmin()) {
            adminChildren.push({ path: '/admin/branches', icon: '🏢', label: 'Branches' });
        }
        if (this.auth.hasPermission('transfer_stock') || this.auth.isAdmin()) {
            adminChildren.push({ path: '/admin/transfers', icon: '🚚', label: 'Transfers' });
        }
        if (this.auth.hasPermission('manage_meta_fields') || this.auth.isAdmin()) {
            adminChildren.push({ path: '/admin/meta-setup', icon: '📝', label: 'Meta Setup' });
        }
        if (this.auth.hasPermission('manage_taxes') || this.auth.isAdmin()) {
            adminChildren.push({ path: '/admin/taxes', icon: '💰', label: 'Tax Settings' });
        }
        if (this.auth.hasPermission('manage_discounts') || this.auth.isAdmin()) {
            adminChildren.push({ path: '/admin/discounts', icon: '🏷️', label: 'Discounts' });
        }
        if (this.auth.hasPermission('manage_shop_config') || this.auth.isAdmin()) {
            adminChildren.push({ path: '/admin/shop-config', icon: '🏪', label: 'Shop Config' });
        }
        if (this.auth.hasPermission('manage_print_config') || this.auth.isAdmin()) {
            adminChildren.push({ path: '/admin/print-config', icon: '🖨️', label: 'Print Config' });
        }
        if (this.auth.hasPermission('manage_settings') || this.auth.isAdmin()) {
            adminChildren.push({ path: '/admin/system-config', icon: '⚙️', label: 'System & Backup' });
            adminChildren.push({ path: '/admin/test-results', icon: '🧪', label: 'Test Results' });
        }

        if (adminChildren.length > 0) {
            this.navItems.push({
                path: '/admin',
                icon: '⚙️',
                label: 'Admin Settings',
                children: adminChildren
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

    @HostListener('window:resize', ['$event'])
    onResize(event: any) {
        if (window.innerWidth > 768 && this.sidebarCollapsed) {
            this.sidebarCollapsed = false;
        }
        if (window.innerWidth > 768 && this.mobileMenuOpen) {
            this.mobileMenuOpen = false;
        }
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
