import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService, Tenant } from '../../../services/tenant.service';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenants.component.html',
  styleUrl: './tenants.component.css'
})
export class TenantsComponent implements OnInit {
  tenants: Tenant[] = [];
  loading = false;
  error = '';
  success = '';

  showModal = false;
  editingTenant: Partial<Tenant> | null = null;
  tenantForm: Partial<Tenant> = {
    name: '',
    slug: '',
    plan: 'basic',
    is_active: 1
  };

  constructor(private tenantService: TenantService) {}

  ngOnInit(): void {
    this.loadTenants();
  }

  loadTenants(): void {
    this.loading = true;
    this.tenantService.getTenants().subscribe({
      next: (data) => {
        this.tenants = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load tenants';
        this.loading = false;
      }
    });
  }

  openCreateModal(): void {
    this.editingTenant = null;
    this.tenantForm = { name: '', slug: '', plan: 'basic', is_active: 1, adminUsername: '', adminPassword: '' };
    this.showModal = true;
  }

  openEditModal(tenant: Tenant): void {
    this.editingTenant = tenant;
    this.tenantForm = { ...tenant };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.error = '';
    this.success = '';
  }

  saveTenant(): void {
    this.loading = true;
    if (this.editingTenant && this.editingTenant.id) {
      this.tenantService.updateTenant(this.editingTenant.id, this.tenantForm).subscribe({
        next: () => {
          this.success = 'Tenant updated successfully';
          this.loadTenants();
          this.closeModal();
        },
        error: (err) => {
          this.error = err.error?.error || 'Update failed';
          this.loading = false;
        }
      });
    } else {
      this.tenantService.createTenant(this.tenantForm).subscribe({
        next: () => {
          this.success = 'Tenant created successfully';
          this.loadTenants();
          this.closeModal();
        },
        error: (err) => {
          this.error = err.error?.error || 'Creation failed';
          this.loading = false;
        }
      });
    }
  }

  deleteTenant(id: number | undefined): void {
    if (!id) return;
    if (confirm('Are you sure you want to completely delete this tenant and ALL associated data? This cannot be undone.')) {
      this.loading = true;
      this.tenantService.deleteTenant(id).subscribe({
        next: () => {
          this.success = 'Tenant deleted permanently.';
          this.loadTenants();
        },
        error: (err) => {
          this.error = err.error?.error || 'Deletion failed.';
          this.loading = false;
        }
      });
    }
  }
}
