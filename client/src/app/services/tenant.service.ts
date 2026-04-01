import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Tenant {
    id: number;
    name: string;
    slug: string;
    plan: string;
    is_active: number;
    created_at?: string;
    adminUsername?: string;
    adminPassword?: string;
}

@Injectable({
    providedIn: 'root'
})
export class TenantService {
    private apiUrl = '/api/tenants';

    constructor(private http: HttpClient) { }

    getTenants(): Observable<Tenant[]> {
        return this.http.get<Tenant[]>(this.apiUrl);
    }

    getTenant(id: number): Observable<Tenant> {
        return this.http.get<Tenant>(`${this.apiUrl}/${id}`);
    }

    createTenant(tenant: Partial<Tenant>): Observable<Tenant> {
        return this.http.post<Tenant>(this.apiUrl, tenant);
    }

    updateTenant(id: number, tenant: Partial<Tenant>): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}`, tenant);
    }

    deleteTenant(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}
