import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MetaField {
  id?: number;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[] | null;
  is_required: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MetaService {
  private apiUrl = '/api/meta-fields';

  constructor(private http: HttpClient) { }

  getMetaFields(): Observable<MetaField[]> {
    return this.http.get<MetaField[]>(this.apiUrl);
  }

  createMetaField(field: MetaField): Observable<MetaField> {
    return this.http.post<MetaField>(this.apiUrl, field);
  }

  deleteMetaField(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
