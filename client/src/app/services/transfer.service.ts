import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TransferItem {
    id?: number;
    transfer_id?: number;
    product_id: number;
    product_name?: string;
    quantity: number;
}

export interface StockTransfer {
    id?: number;
    from_branch_id: number;
    to_branch_id: number;
    from_branch_name?: string;
    to_branch_name?: string;
    status: 'pending' | 'shipped' | 'received' | 'cancelled';
    notes: string;
    created_at?: string;
    items?: TransferItem[];
}

@Injectable({
  providedIn: 'root'
})
export class TransferService {
  private apiUrl = '/api/transfers';

  constructor(private http: HttpClient) { }

  getTransfers(): Observable<StockTransfer[]> {
    return this.http.get<StockTransfer[]>(this.apiUrl);
  }

  createTransfer(transfer: Partial<StockTransfer>): Observable<{ id: number, message: string }> {
    return this.http.post<{ id: number, message: string }>(this.apiUrl, transfer);
  }

  updateTransferStatus(id: number, status: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/status`, { status });
  }
}
