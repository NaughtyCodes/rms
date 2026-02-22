import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InvoiceItem {
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    discount: number;
    line_total: number;
}

export interface Invoice {
    id: number;
    invoice_number: string;
    subtotal: number;
    discount: number;
    tax_percent: number;
    tax_amount: number;
    total: number;
    payment_mode: string;
    customer_name: string;
    customer_phone: string;
    cashier: string;
    created_at: string;
    items: InvoiceItem[];
}

export interface CreateInvoiceRequest {
    items: { product_id: number; quantity: number; discount?: number }[];
    discount?: number;
    tax_percent?: number;
    payment_mode?: string;
    customer_name?: string;
    customer_phone?: string;
}

@Injectable({ providedIn: 'root' })
export class BillingService {
    constructor(private http: HttpClient) { }

    createInvoice(data: CreateInvoiceRequest): Observable<Invoice> {
        return this.http.post<Invoice>('/api/invoices', data);
    }

    getInvoices(params?: { date?: string; from?: string; to?: string; page?: number }): Observable<{ invoices: Invoice[]; total: number }> {
        return this.http.get<{ invoices: Invoice[]; total: number }>('/api/invoices', { params: params as any });
    }

    getInvoice(id: number): Observable<Invoice> {
        return this.http.get<Invoice>(`/api/invoices/${id}`);
    }
}
