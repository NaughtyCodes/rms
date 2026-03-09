import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
    {
        path: '',
        loadComponent: () => import('./pages/layout/layout.component').then(m => m.LayoutComponent),
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
            { path: 'inventory', loadComponent: () => import('./pages/inventory/inventory.component').then(m => m.InventoryComponent) },
            { path: 'billing', loadComponent: () => import('./pages/billing/billing.component').then(m => m.BillingComponent) },
            { path: 'invoices', loadComponent: () => import('./pages/invoices/invoices.component').then(m => m.InvoicesComponent) },
            { path: 'reports', loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent) },
            { path: 'admin', loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent) },
            { path: 'admin/meta-setup', loadComponent: () => import('./pages/admin/meta-setup/meta-setup.component').then(m => m.MetaSetupComponent) },
            { path: 'admin/discounts', loadComponent: () => import('./pages/admin/discounts/discounts.component').then(m => m.DiscountsComponent) },
            { path: 'admin/taxes', loadComponent: () => import('./pages/admin/taxes/taxes.component').then(m => m.TaxesComponent) },
            { path: 'admin/stock-management', loadComponent: () => import('./pages/admin/stock-management/stock-management.component').then(m => m.StockManagementComponent) },
            { path: 'admin/shop-config', loadComponent: () => import('./pages/admin/shop-config/shop-config.component').then(m => m.ShopConfigComponent) },
            { path: 'admin/print-config', loadComponent: () => import('./pages/admin/print-config/print-config.component').then(m => m.PrintConfigComponent) },
        ]
    },
    { path: '**', redirectTo: '' }
];
