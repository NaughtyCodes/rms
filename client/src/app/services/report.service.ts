import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReportService {
    constructor(private http: HttpClient) { }

    getDashboard(): Observable<any> {
        return this.http.get('/api/reports/dashboard');
    }

    getDaily(date: string): Observable<any> {
        return this.http.get('/api/reports/daily', { params: { date } });
    }

    getMonthly(month: string, year: string): Observable<any> {
        return this.http.get('/api/reports/monthly', { params: { month, year } });
    }

    getTopProducts(limit: number = 10, days: number = 30): Observable<any> {
        return this.http.get('/api/reports/top-products', { params: { limit, days } });
    }

    getStockValuation(): Observable<any> {
        return this.http.get('/api/reports/stock-valuation');
    }
}
