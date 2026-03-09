import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaxService, TaxSlab } from '../../../services/tax.service';

@Component({
  selector: 'app-taxes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './taxes.component.html',
  styleUrl: './taxes.component.css'
})
export class TaxesComponent implements OnInit {
  taxes: TaxSlab[] = [];
  isLoading = false;
  message = '';

  newTax: TaxSlab = { name: '', rate: 0, is_active: true };

  constructor(private taxService: TaxService) {}

  ngOnInit() {
    this.loadTaxes();
  }

  loadTaxes() {
    this.isLoading = true;
    this.taxService.getTaxes().subscribe({
      next: (data) => {
        this.taxes = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  addTax() {
    if (!this.newTax.name || this.newTax.rate < 0) return;
    this.isLoading = true;
    this.taxService.createTax(this.newTax).subscribe({
      next: (tax) => {
        this.taxes.push(tax);
        this.newTax = { name: '', rate: 0, is_active: true };
        this.message = 'Tax slab added successfully!';
        setTimeout(() => this.message = '', 3000);
        this.isLoading = false;
      },
      error: (err) => {
        this.message = err.error?.error || 'Failed to add tax';
        this.isLoading = false;
      }
    });
  }

  deleteTax(id: number, idx: number) {
    if (confirm('Are you sure you want to deactivate this tax slab? Note: existing products will keep their historic tax value.')) {
      this.taxService.deleteTax(id).subscribe({
        next: () => {
          this.taxes.splice(idx, 1);
        },
        error: (err) => console.error(err)
      });
    }
  }
}
