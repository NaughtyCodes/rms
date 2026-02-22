import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReportService } from '../../services/report.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
    data: any = null;
    loading = true;

    constructor(private reportService: ReportService) { }

    ngOnInit() {
        this.reportService.getDashboard().subscribe({
            next: (res) => { this.data = res; this.loading = false; },
            error: () => { this.loading = false; }
        });
    }

    getPaymentAmount(mode: string): number {
        return this.data?.payment_split?.find((p: any) => p.payment_mode === mode)?.amount || 0;
    }
}
