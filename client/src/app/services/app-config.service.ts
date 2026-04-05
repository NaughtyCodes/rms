import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AppConfigEntry {
  key: string;
  value: string;
  description?: string;
  type?: string;
  updated_at?: string;
}

export interface TenantSettingEntry {
  key: string;
  value: string;
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private baseUrl = '/api/app-config';

  constructor(private http: HttpClient) {}

  // ── Global App Config (SuperAdmin) ──────────────────────────────────────────
  getGlobalConfigs(): Observable<AppConfigEntry[]> {
    return this.http.get<AppConfigEntry[]>(`${this.baseUrl}/global`);
  }

  createGlobalConfig(entry: AppConfigEntry): Observable<any> {
    return this.http.post(`${this.baseUrl}/global`, entry);
  }

  updateGlobalConfig(key: string, entry: Partial<AppConfigEntry>): Observable<any> {
    return this.http.put(`${this.baseUrl}/global/${key}`, entry);
  }

  deleteGlobalConfig(key: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/global/${key}`);
  }

  // ── Tenant Settings (Admin) ──────────────────────────────────────────────────
  getTenantSettings(): Observable<TenantSettingEntry[]> {
    return this.http.get<TenantSettingEntry[]>(`${this.baseUrl}/tenant`);
  }

  createTenantSetting(entry: TenantSettingEntry): Observable<any> {
    return this.http.post(`${this.baseUrl}/tenant`, entry);
  }

  updateTenantSetting(key: string, value: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/tenant/${key}`, { value });
  }

  deleteTenantSetting(key: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/tenant/${key}`);
  }
}
