import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppConfigService, AppConfigEntry, TenantSettingEntry } from '../../../services/app-config.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-app-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app-config.component.html',
  styleUrl: './app-config.component.css'
})
export class AppConfigComponent implements OnInit {
  activeTab: 'tenant' | 'global' = 'tenant';
  isSuperAdmin = false;

  // Tenant settings
  tenantSettings: TenantSettingEntry[] = [];
  filteredTenantSettings: TenantSettingEntry[] = [];
  tenantSearch = '';

  // Global configs
  globalConfigs: AppConfigEntry[] = [];
  filteredGlobalConfigs: AppConfigEntry[] = [];
  globalSearch = '';

  // Modal state
  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  modalScope: 'tenant' | 'global' = 'tenant';
  editingKey = '';

  formKey = '';
  formValue = '';
  formDescription = '';
  formType = 'string';
  typeOptions = ['string', 'number', 'boolean', 'json'];

  // UI state
  isLoading = false;
  isSaving = false;
  deleteConfirmKey: string | null = null;
  toast = { show: false, message: '', success: true };

  constructor(
    private appConfigService: AppConfigService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.isSuperAdmin = this.authService.isSuperAdmin();
    if (this.isSuperAdmin) this.activeTab = 'global';
    this.loadData();
  }

  loadData() {
    this.loadTenantSettings();
    if (this.isSuperAdmin) this.loadGlobalConfigs();
  }

  loadTenantSettings() {
    this.isLoading = true;
    this.appConfigService.getTenantSettings().subscribe({
      next: (data) => {
        this.tenantSettings = data;
        this.applyTenantFilter();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  loadGlobalConfigs() {
    this.appConfigService.getGlobalConfigs().subscribe({
      next: (data) => {
        this.globalConfigs = data;
        this.applyGlobalFilter();
      },
      error: () => {}
    });
  }

  applyTenantFilter() {
    const q = this.tenantSearch.toLowerCase();
    this.filteredTenantSettings = this.tenantSettings.filter(s =>
      s.key.toLowerCase().includes(q) || s.value.toLowerCase().includes(q)
    );
  }

  applyGlobalFilter() {
    const q = this.globalSearch.toLowerCase();
    this.filteredGlobalConfigs = this.globalConfigs.filter(c =>
      c.key.toLowerCase().includes(q) || c.value.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
  }

  setTab(tab: 'tenant' | 'global') {
    this.activeTab = tab;
  }

  openCreateModal(scope: 'tenant' | 'global') {
    this.modalMode = 'create';
    this.modalScope = scope;
    this.formKey = '';
    this.formValue = '';
    this.formDescription = '';
    this.formType = 'string';
    this.editingKey = '';
    this.showModal = true;
  }

  openEditModal(scope: 'tenant' | 'global', item: any) {
    this.modalMode = 'edit';
    this.modalScope = scope;
    this.editingKey = item.key;
    this.formKey = item.key;
    this.formValue = item.value;
    this.formDescription = item.description || '';
    this.formType = item.type || 'string';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.deleteConfirmKey = null;
  }

  save() {
    if (!this.formValue.trim()) return;
    this.isSaving = true;

    if (this.modalScope === 'tenant') {
      if (this.modalMode === 'create') {
        if (!this.formKey.trim()) { this.isSaving = false; return; }
        this.appConfigService.createTenantSetting({ key: this.formKey.trim(), value: this.formValue.trim() }).subscribe({
          next: () => { this.showToast('Setting created!', true); this.closeModal(); this.loadTenantSettings(); this.isSaving = false; },
          error: (e) => { this.showToast(e.error?.error || 'Error creating setting', false); this.isSaving = false; }
        });
      } else {
        this.appConfigService.updateTenantSetting(this.editingKey, this.formValue.trim()).subscribe({
          next: () => { this.showToast('Setting updated!', true); this.closeModal(); this.loadTenantSettings(); this.isSaving = false; },
          error: (e) => { this.showToast(e.error?.error || 'Error updating', false); this.isSaving = false; }
        });
      }
    } else {
      const payload: AppConfigEntry = { key: this.formKey.trim(), value: this.formValue.trim(), description: this.formDescription.trim(), type: this.formType };
      if (this.modalMode === 'create') {
        this.appConfigService.createGlobalConfig(payload).subscribe({
          next: () => { this.showToast('Config created!', true); this.closeModal(); this.loadGlobalConfigs(); this.isSaving = false; },
          error: (e) => { this.showToast(e.error?.error || 'Error creating config', false); this.isSaving = false; }
        });
      } else {
        this.appConfigService.updateGlobalConfig(this.editingKey, payload).subscribe({
          next: () => { this.showToast('Config updated!', true); this.closeModal(); this.loadGlobalConfigs(); this.isSaving = false; },
          error: (e) => { this.showToast(e.error?.error || 'Error updating', false); this.isSaving = false; }
        });
      }
    }
  }

  confirmDelete(key: string) {
    this.deleteConfirmKey = key;
  }

  cancelDelete() {
    this.deleteConfirmKey = null;
  }

  doDelete(scope: 'tenant' | 'global', key: string) {
    const obs = scope === 'tenant'
      ? this.appConfigService.deleteTenantSetting(key)
      : this.appConfigService.deleteGlobalConfig(key);

    obs.subscribe({
      next: () => {
        this.showToast('Deleted successfully.', true);
        this.deleteConfirmKey = null;
        if (scope === 'tenant') this.loadTenantSettings();
        else this.loadGlobalConfigs();
      },
      error: (e) => this.showToast(e.error?.error || 'Error deleting', false)
    });
  }

  showToast(message: string, success: boolean) {
    this.toast = { show: true, message, success };
    setTimeout(() => this.toast.show = false, 3000);
  }

  trackByKey(_: number, item: any) { return item.key; }
}
