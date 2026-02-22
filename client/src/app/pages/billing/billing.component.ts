import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, Product } from '../../services/inventory.service';
import { BillingService } from '../../services/billing.service';
import { SettingsService, ShopSettings } from '../../services/settings.service';

interface CartItem {
    product: Product;
    quantity: number;
    discount: number;
    lineTotal: number;
}

@Component({
    selector: 'app-billing',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './billing.component.html',
    styleUrl: './billing.component.css'
})
export class BillingComponent implements OnInit {
    products: Product[] = [];
    search = '';
    filteredProducts: Product[] = [];
    cart: CartItem[] = [];
    billDiscount = 0;
    taxPercent = 0;
    paymentMode = 'cash';
    customerName = '';
    customerPhone = '';
    processing = false;

    // Receipt
    showReceipt = false;
    lastInvoice: any = null;

    toast = { show: false, message: '', type: 'success' };

    settings: ShopSettings | null = null;

    constructor(
        private inventoryService: InventoryService,
        private billingService: BillingService,
        public settingsService: SettingsService
    ) { }

    ngOnInit() {
        this.loadProducts();
        this.settingsService.settings$.subscribe(s => this.settings = s);
    }

    loadProducts() {
        this.inventoryService.getProducts({ limit: 500 }).subscribe({
            next: (res) => {
                this.products = res.products;
                this.filteredProducts = [];
            }
        });
    }

    onSearch() {
        if (!this.search.trim()) {
            this.filteredProducts = [];
            return;
        }
        const q = this.search.toLowerCase();
        this.filteredProducts = this.products.filter(
            p => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q))
        ).slice(0, 10);
    }

    addToCart(product: Product) {
        const existing = this.cart.find(c => c.product.id === product.id);
        if (existing) {
            if (existing.quantity < product.quantity) {
                existing.quantity++;
                this.recalcLine(existing);
            } else {
                this.showToast('Not enough stock!', 'error');
            }
        } else {
            if (product.quantity < 1) {
                this.showToast('Out of stock!', 'error');
                return;
            }
            const item: CartItem = { product, quantity: 1, discount: 0, lineTotal: product.selling_price };
            this.cart.push(item);
        }
        this.search = '';
        this.filteredProducts = [];
    }

    removeFromCart(index: number) {
        this.cart.splice(index, 1);
    }

    updateQuantity(item: CartItem, delta: number) {
        const newQty = item.quantity + delta;
        if (newQty < 1) return;
        if (newQty > item.product.quantity) {
            this.showToast('Not enough stock!', 'error');
            return;
        }
        item.quantity = newQty;
        this.recalcLine(item);
    }

    recalcLine(item: CartItem) {
        item.lineTotal = (item.product.selling_price * item.quantity) - item.discount;
    }

    get subtotal(): number {
        return this.cart.reduce((sum, i) => sum + i.lineTotal, 0);
    }

    get taxableAmount(): number {
        return this.subtotal - this.billDiscount;
    }

    get taxAmount(): number {
        if (!this.settings) return 0;
        let invoiceTax = 0;

        // Distribute discount proportionally to calculate tax per item accurately
        const discountRatio = this.subtotal > 0 ? (this.billDiscount / this.subtotal) : 0;

        for (const item of this.cart) {
            const itemTaxable = item.lineTotal * (1 - discountRatio);
            let rate = 0;
            if (this.settings.tax_mode === 'product') {
                rate = item.product.tax_rate || 0;
            } else if (this.settings.tax_mode === 'category') {
                rate = item.product.category_tax_rate || 0;
            }
            invoiceTax += (itemTaxable * rate) / 100;
        }

        return Math.round(invoiceTax * 100) / 100;
    }

    get grandTotal(): number {
        return Math.round((this.taxableAmount + this.taxAmount) * 100) / 100;
    }

    createBill() {
        if (!this.cart.length) {
            this.showToast('Cart is empty!', 'error');
            return;
        }
        this.processing = true;

        const data = {
            items: this.cart.map(c => ({
                product_id: c.product.id,
                quantity: c.quantity,
                discount: c.discount
            })),
            discount: this.billDiscount,
            tax_percent: this.taxPercent,
            payment_mode: this.paymentMode,
            customer_name: this.customerName,
            customer_phone: this.customerPhone,
        };

        this.billingService.createInvoice(data).subscribe({
            next: (invoice) => {
                this.lastInvoice = invoice;
                this.showReceipt = true;
                this.cart = [];
                this.billDiscount = 0;
                this.taxPercent = 0;
                this.customerName = '';
                this.customerPhone = '';
                this.processing = false;
                this.loadProducts();
                this.showToast('Bill created successfully!', 'success');
            },
            error: (err) => {
                this.processing = false;
                this.showToast(err.error?.error || 'Failed to create bill', 'error');
            }
        });
    }

    printReceipt() {
        window.print();
    }

    newBill() {
        this.showReceipt = false;
        this.lastInvoice = null;
    }

    showToast(message: string, type: string) {
        this.toast = { show: true, message, type };
        setTimeout(() => this.toast.show = false, 3000);
    }
}
