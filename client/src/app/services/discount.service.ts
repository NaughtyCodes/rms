import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductDiscount {
  id?: number;
  product_id: number;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DiscountService {
  private apiUrl = '/api/discounts';

  constructor(private http: HttpClient) { }

  // Get active discount for a specific product
  getDiscountForProduct(productId: number): Observable<ProductDiscount | null> {
    return this.http.get<ProductDiscount | null>(`${this.apiUrl}/${productId}`);
  }

  applyDiscount(discount: Partial<ProductDiscount>): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.apiUrl, discount);
  }

  removeDiscount(productId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${productId}`);
  }
}
