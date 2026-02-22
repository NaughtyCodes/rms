import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../services/report.service';

@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './reports.component.html',
    styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {
    activeTab = 'daily';
    loading = false;

    // Daily
    dailyDate = '';
    dailyData: any = null;

    // Monthly
    monthlyMonth = '';
    monthlyYear = '';
    monthlyData: any = null;

    // Top Products
    topProducts: any[] = [];
    topDays = 30;

    // Stock
    stockData: any = null;

    years = [2024, 2025, 2026, 2027];
    months = [
        { val: '01', name: 'January' }, { val: '02', name: 'February' },
        { val: '03', name: 'March' }, { val: '04', name: 'April' },
        { val: '05', name: 'May' }, { val: '06', name: 'June' },
        { val: '07', name: 'July' }, { val: '08', name: 'August' },
        { val: '09', name: 'September' }, { val: '10', name: 'October' },
        { val: '11', name: 'November' }, { val: '12', name: 'December' }
    ];

    constructor(private reportService: ReportService) { }

    ngOnInit() {
        const now = new Date();
        this.dailyDate = now.toISOString().slice(0, 10);
        this.monthlyMonth = String(now.getMonth() + 1).padStart(2, '0');
        this.monthlyYear = String(now.getFullYear());
        this.loadDaily();
    }

    switchTab(tab: string) {
        this.activeTab = tab;
        if (tab === 'daily' && !this.dailyData) this.loadDaily();
        if (tab === 'monthly' && !this.monthlyData) this.loadMonthly();
        if (tab === 'top' && !this.topProducts.length) this.loadTopProducts();
        if (tab === 'stock' && !this.stockData) this.loadStock();
    }

    loadDaily() {
        this.loading = true;
        this.reportService.getDaily(this.dailyDate).subscribe({
            next: (res) => { this.dailyData = res; this.loading = false; },
            error: () => this.loading = false
        });
    }

    loadMonthly() {
        this.loading = true;
        this.reportService.getMonthly(this.monthlyMonth, this.monthlyYear).subscribe({
            next: (res) => { this.monthlyData = res; this.loading = false; },
            error: () => this.loading = false
        });
    }

    loadTopProducts() {
        this.loading = true;
        this.reportService.getTopProducts(10, this.topDays).subscribe({
            next: (res) => { this.topProducts = res; this.loading = false; },
            error: () => this.loading = false
        });
    }

    loadStock() {
        this.loading = true;
        this.reportService.getStockValuation().subscribe({
            next: (res) => { this.stockData = res; this.loading = false; },
            error: () => this.loading = false
        });
    }

    getMaxQty(): number {
        if (!this.topProducts.length) return 1;
        return this.topProducts[0]?.total_qty || 1;
    }
}
