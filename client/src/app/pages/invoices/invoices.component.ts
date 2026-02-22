import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BillingService, Invoice } from '../../services/billing.service';

@Component({
    selector: 'app-invoices',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './invoices.component.html',
    styleUrl: './invoices.component.css'
})
export class InvoicesComponent implements OnInit {
    invoices: Invoice[] = [];
    total = 0;
    loading = true;
    dateFilter = '';
    selectedInvoice: Invoice | null = null;

    constructor(private billingService: BillingService) { }

    ngOnInit() {
        const today = new Date().toISOString().slice(0, 10);
        this.dateFilter = today;
        this.loadInvoices();
    }

    loadInvoices() {
        this.loading = true;
        const params: any = {};
        if (this.dateFilter) params.date = this.dateFilter;

        this.billingService.getInvoices(params).subscribe({
            next: (res) => { this.invoices = res.invoices; this.total = res.total; this.loading = false; },
            error: () => { this.loading = false; }
        });
    }

    viewInvoice(inv: Invoice) {
        this.billingService.getInvoice(inv.id).subscribe({
            next: (res) => this.selectedInvoice = res
        });
    }

    closeDetail() { this.selectedInvoice = null; }

    getTotalRevenue(): number {
        return this.invoices.reduce((s, i) => s + i.total, 0);
    }
}
