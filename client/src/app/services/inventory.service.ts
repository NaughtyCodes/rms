import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Product {
    id: number;
    name: string;
    barcode: string;
    category_id: number;
    category_name: string;
    cost_price: number;
    selling_price: number;
    quantity: number;
    low_stock_threshold: number;
    unit: string;
    tax_rate: number;
    category_tax_rate: number;
    created_at: string;
    updated_at: string;
}

export interface ProductListResponse {
    products: Product[];
    total: number;
    page: number;
    limit: number;
}

export interface Category {
    id: number;
    name: string;
    description: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
    constructor(private http: HttpClient) { }

    getProducts(params?: { search?: string; category_id?: number; page?: number; limit?: number; sort?: string; order?: string }): Observable<ProductListResponse> {
        let httpParams = new HttpParams();
        if (params) {
            Object.entries(params).forEach(([key, val]) => {
                if (val !== undefined && val !== null && val !== '') {
                    httpParams = httpParams.set(key, val.toString());
                }
            });
        }
        return this.http.get<ProductListResponse>('/api/products', { params: httpParams });
    }

    getProduct(id: number): Observable<Product> {
        return this.http.get<Product>(`/api/products/${id}`);
    }

    createProduct(product: Partial<Product>): Observable<Product> {
        return this.http.post<Product>('/api/products', product);
    }

    updateProduct(id: number, product: Partial<Product>): Observable<Product> {
        return this.http.put<Product>(`/api/products/${id}`, product);
    }

    deleteProduct(id: number): Observable<any> {
        return this.http.delete(`/api/products/${id}`);
    }

    // --- NEW: Batch & Running Inventory Methods ---
    
    getProductBatches(productId: number): Observable<any[]> {
        return this.http.get<any[]>(`/api/inventory/batches/${productId}`);
    }

    addStock(data: { product_id: number; batch_number: string; quantity: number; cost_price?: number; expiry_date?: string; meta_data?: any }): Observable<any> {
        return this.http.post('/api/inventory/stock-in', data);
    }

    recordDamage(data: { product_id: number; batch_id?: number | null; quantity: number; reason: string }): Observable<any> {
        return this.http.post('/api/inventory/damage', data);
    }

    getTransactionLogs(): Observable<any[]> {
        return this.http.get<any[]>('/api/inventory/transactions');
    }

    // --- End NEW ---

    getLowStock(): Observable<Product[]> {
        return this.http.get<Product[]>('/api/products/low-stock');
    }

    getCategories(): Observable<Category[]> {
        return this.http.get<Category[]>('/api/categories');
    }

    createCategory(name: string, description: string = ''): Observable<Category> {
        return this.http.post<Category>('/api/categories', { name, description });
    }

    updateCategory(id: number, name: string, description: string = ''): Observable<Category> {
        return this.http.put<Category>(`/api/categories/${id}`, { name, description });
    }

    deleteCategory(id: number): Observable<any> {
        return this.http.delete(`/api/categories/${id}`);
    }
}
