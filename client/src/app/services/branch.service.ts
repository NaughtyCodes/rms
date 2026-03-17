import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Branch {
    id?: number;
    name: string;
    address: string;
    phone: string;
    is_warehouse: number;
    is_active: number;
    created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BranchService {
  private apiUrl = '/api/branches';

  constructor(private http: HttpClient) { }

  getBranches(): Observable<Branch[]> {
    return this.http.get<Branch[]>(this.apiUrl);
  }

  createBranch(branch: Partial<Branch>): Observable<{ id: number, name: string }> {
    return this.http.post<{ id: number, name: string }>(this.apiUrl, branch);
  }

  updateBranch(id: number, branch: Partial<Branch>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}`, branch);
  }
}
