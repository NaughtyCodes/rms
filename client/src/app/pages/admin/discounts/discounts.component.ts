import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiscountService, ProductDiscount } from '../../../services/discount.service';
import { InventoryService, Product } from '../../../services/inventory.service';

@Component({
  selector: 'app-discounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './discounts.component.html',
  styleUrl: './discounts.component.css'
})
export class DiscountsComponent implements OnInit {
  products: Product[] = [];
  selectedProductId: number | null = null;
  activeDiscount: ProductDiscount | null = null;
  
  newDiscount: Partial<ProductDiscount> = {
    discount_type: 'percentage',
    discount_value: 0
  };

  isLoading = false;
  message = '';

  constructor(
    private discountService: DiscountService,
    private inventoryService: InventoryService
  ) {}

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.inventoryService.getProducts({ limit: 1000 }).subscribe({
      next: (res) => this.products = res.products,
      error: (err) => console.error(err)
    });
  }

  onProductSelect() {
    if (!this.selectedProductId) {
      this.activeDiscount = null;
      return;
    }
    
    this.isLoading = true;
    this.discountService.getDiscountForProduct(this.selectedProductId).subscribe({
      next: (discount) => {
        this.activeDiscount = discount;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  applyDiscount() {
    if (!this.selectedProductId || this.newDiscount.discount_value! <= 0) return;
    
    this.isLoading = true;
    const payload = { ...this.newDiscount, product_id: this.selectedProductId };
    
    this.discountService.applyDiscount(payload).subscribe({
      next: () => {
        this.message = 'Discount applied successfully!';
        setTimeout(() => this.message = '', 3000);
        this.onProductSelect(); // reload active discount
      },
      error: (err) => {
        this.message = err.error?.error || 'Failed to apply discount';
        this.isLoading = false;
      }
    });
  }

  removeDiscount() {
    if (!this.selectedProductId) return;
    
    this.isLoading = true;
    this.discountService.removeDiscount(this.selectedProductId).subscribe({
      next: () => {
        this.message = 'Discount removed successfully!';
        setTimeout(() => this.message = '', 3000);
        this.activeDiscount = null;
        this.isLoading = false;
      },
      error: (err) => {
        this.message = err.error?.error || 'Failed to remove discount';
        this.isLoading = false;
      }
    });
  }
}
