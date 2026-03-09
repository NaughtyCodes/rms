import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, Product } from '../../../services/inventory.service';

interface DynamicField {
  key: string;
  value: string;
}

@Component({
  selector: 'app-stock-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-management.component.html',
  styleUrl: './stock-management.component.css'
})
export class StockManagementComponent implements OnInit {
  products: Product[] = [];
  selectedProductId: number | null = null;
  
  batches: any[] = [];
  transactions: any[] = [];
  
  activeTab: 'add' | 'damage' | 'history' = 'add';
  isLoading = false;
  message = '';

  // Add Stock Model
  newStock = {
    batch_number: '',
    quantity: 1,
    cost_price: 0,
    expiry_date: ''
  };
  dynamicFields: DynamicField[] = [];

  // Damage Model
  damageData = {
    batch_id: null as number | null,
    quantity: 1,
    reason: ''
  };

  constructor(private inventoryService: InventoryService) {}

  ngOnInit() {
    this.loadProducts();
    this.loadTransactions();
  }

  loadProducts() {
    this.inventoryService.getProducts({ limit: 1000 }).subscribe({
      next: (res) => this.products = res.products,
      error: (err) => console.error(err)
    });
  }

  onProductSelect() {
    if (!this.selectedProductId) {
      this.batches = [];
      return;
    }
    this.isLoading = true;
    this.inventoryService.getProductBatches(this.selectedProductId).subscribe({
      next: (data) => {
        this.batches = data;
        // Auto-select latest batch for damage if available
        if (this.batches.length > 0) {
          this.damageData.batch_id = this.batches[0].id;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  loadTransactions() {
    this.inventoryService.getTransactionLogs().subscribe({
      next: (data) => this.transactions = data,
      error: (err) => console.error(err)
    });
  }

  // --- Dynamic Meta Fields Logic ---
  addDynamicField() {
    this.dynamicFields.push({ key: '', value: '' });
  }

  removeDynamicField(index: number) {
    this.dynamicFields.splice(index, 1);
  }

  // --- Submit Handlers ---
  submitAddStock() {
    if (!this.selectedProductId || !this.newStock.batch_number || this.newStock.quantity <= 0) return;
    
    this.isLoading = true;
    
    // Construct Meta JSON
    const metaData: any = {};
    for (const field of this.dynamicFields) {
      if (field.key.trim() && field.value.trim()) {
        metaData[field.key.trim()] = field.value.trim();
      }
    }

    const payload = {
      product_id: this.selectedProductId,
      batch_number: this.newStock.batch_number,
      quantity: this.newStock.quantity,
      cost_price: this.newStock.cost_price || undefined,
      expiry_date: this.newStock.expiry_date || undefined,
      meta_data: Object.keys(metaData).length > 0 ? metaData : undefined
    };

    this.inventoryService.addStock(payload).subscribe({
      next: () => {
        this.message = 'Stock added and batch registered successfully!';
        setTimeout(() => this.message = '', 3000);
        this.resetAddStockForm();
        this.onProductSelect(); // Reload batches
        this.loadTransactions(); // Reload history
      },
      error: (err) => {
        this.message = err.error?.error || 'Failed to add stock';
        this.isLoading = false;
      }
    });
  }

  submitDamage() {
    if (!this.selectedProductId || this.damageData.quantity <= 0 || !this.damageData.reason) return;

    this.isLoading = true;
    const payload = {
      product_id: this.selectedProductId,
      batch_id: this.damageData.batch_id,
      quantity: this.damageData.quantity,
      reason: this.damageData.reason
    };

    this.inventoryService.recordDamage(payload).subscribe({
      next: () => {
        this.message = 'Damage recorded successfully!';
        setTimeout(() => this.message = '', 3000);
        this.damageData.quantity = 1;
        this.damageData.reason = '';
        this.onProductSelect(); // Reload batches (for updated QTY)
        this.loadTransactions(); // Reload history
      },
      error: (err) => {
        this.message = err.error?.error || 'Failed to record damage';
        this.isLoading = false;
      }
    });
  }

  private resetAddStockForm() {
    this.newStock = { batch_number: '', quantity: 1, cost_price: 0, expiry_date: '' };
    this.dynamicFields = [];
    this.isLoading = false;
  }
}
