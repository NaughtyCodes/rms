import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TaxSlab {
  id?: number;
  name: string;
  rate: number;
  is_active?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TaxService {
  private apiUrl = '/api/taxes';

  constructor(private http: HttpClient) { }

  getTaxes(): Observable<TaxSlab[]> {
    return this.http.get<TaxSlab[]>(this.apiUrl);
  }

  createTax(tax: TaxSlab): Observable<TaxSlab> {
    return this.http.post<TaxSlab>(this.apiUrl, tax);
  }

  deleteTax(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
