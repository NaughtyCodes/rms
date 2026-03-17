import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, Product } from '../../services/inventory.service';
import { BillingService } from '../../services/billing.service';
import { SettingsService, ShopSettings } from '../../services/settings.service';
import { DiscountService, ProductDiscount } from '../../services/discount.service';

interface CartItem {
    product: Product;
    quantity: number;
    unitDiscount: number;
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
        public settingsService: SettingsService,
        private discountService: DiscountService
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
        const availableQty = product.branch_quantity !== undefined ? product.branch_quantity : product.quantity;
        const existing = this.cart.find(c => c.product.id === product.id);
        if (existing) {
            if (existing.quantity < availableQty) {
                existing.quantity++;
                this.recalcLine(existing);
            } else {
                this.showToast('Not enough stock in branch!', 'error');
            }
            this.search = '';
            this.filteredProducts = [];
        } else {
            if (availableQty < 1) {
                this.showToast('Out of stock in branch!', 'error');
                return;
            }
            
            // Check for active discount
            this.discountService.getDiscountForProduct(product.id).subscribe({
                next: (discount: ProductDiscount | null) => {
                    let discountAmount = 0;
                    if (discount) {
                        if (discount.discount_type === 'percentage') {
                            discountAmount = (product.selling_price * discount.discount_value) / 100;
                        } else {
                            discountAmount = discount.discount_value;
                        }
                    }
                    
                    const item: CartItem = { 
                        product, 
                        quantity: 1, 
                        unitDiscount: discountAmount,
                        discount: discountAmount, 
                        lineTotal: product.selling_price - discountAmount
                    };
                    
                    this.cart.push(item);
                    this.search = '';
                    this.filteredProducts = [];
                },
                error: () => {
                    // Fallback if discount fetch fails
                    const item: CartItem = { product, quantity: 1, unitDiscount: 0, discount: 0, lineTotal: product.selling_price };
                    this.cart.push(item);
                    this.search = '';
                    this.filteredProducts = [];
                }
            });
        }
    }

    removeFromCart(index: number) {
        this.cart.splice(index, 1);
    }

    updateQuantity(item: CartItem, delta: number) {
        const newQty = item.quantity + delta;
        const availableQty = item.product.branch_quantity !== undefined ? item.product.branch_quantity : item.product.quantity;
        
        if (newQty < 1) return;
        if (newQty > availableQty) {
            this.showToast('Not enough stock in branch!', 'error');
            return;
        }
        item.quantity = newQty;
        this.recalcLine(item);
    }

    recalcLine(item: CartItem) {
        item.discount = item.unitDiscount * item.quantity;
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

        // If not in item-specific mode, apply global tax percent
        if (this.settings.tax_mode !== 'product' && this.settings.tax_mode !== 'category') {
            return Math.round((this.taxableAmount * this.taxPercent / 100) * 100) / 100;
        }

        let invoiceTax = 0;
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

    downloadPDF() {
        const receiptEl = document.getElementById('receipt');
        if (!receiptEl) return;

        const fontFamily = this.settings?.font_family || 'Inter';
        const layoutStyle = this.settings?.bill_layout_style || 'modern';
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) return;

        const accentColor = '#6366f1';

        printWindow.document.write(`
            <html>
            <head>
                <title>Invoice - ${this.lastInvoice?.invoice_number || 'Receipt'}</title>
                <base href="${window.location.origin}">
                <link href="https://fonts.googleapis.com/css2?family=${fontFamily}:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: '${fontFamily}', sans-serif; padding: 20px; background: white; color: #111; }
                    .receipt { 
                        position: relative; overflow: hidden;
                        max-width: ${this.settings?.bill_paper_size === 'a4' ? '210mm' : this.settings?.bill_paper_size === 'a5' ? '148mm' : '80mm'}; 
                        margin: 0 auto; padding: 32px; font-size: 13px; 
                    }
                    
                    .watermark {
                        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg);
                        font-size: 80px; font-weight: 900; color: #000; opacity: ${this.settings?.bill_watermark_opacity || 0.1};
                        pointer-events: none; white-space: nowrap; z-index: 1; text-transform: uppercase;
                    }

                    .bill-logo { max-width: 100%; height: auto; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto; }
                    .receipt.receipt-80mm .bill-logo { max-width: 80px; }
                    .receipt.receipt-a5 .bill-logo { max-width: 140px; }
                    .receipt.receipt-a4 .bill-logo { max-width: 200px; }
                    .receipt-header { text-align: center; margin-bottom: 16px; border-bottom: 2px dashed #ccc; padding-bottom: 12px; }
                    .receipt-header h2 { font-size: 20px; margin-bottom: 4px; }
                    .receipt-header p { font-size: 12px; color: #666; }
                    
                    /* Modern Layout */
                    .receipt.modern { border-top: 8px solid ${accentColor}; }
                    .modern h2 { color: ${accentColor}; }
                    .modern th { background: ${accentColor}; color: white; }

                    /* Classic Layout */
                    .receipt.classic { border: 3px double #333; }
                    .classic .receipt-header { border-bottom: 3px double #333; }
                    .classic .receipt-table th, .classic .receipt-table td { border-bottom: 1px solid #333; }

                    /* Minimal Layout */
                    .receipt.minimal .receipt-header, .receipt.minimal .receipt-totals, .receipt.minimal .receipt-footer { border: none; }
                    .minimal .receipt-table th { background: transparent; border-bottom: 2px solid #eee; }

                    .receipt-meta { font-size: 12px; margin-bottom: 12px; }
                    .receipt-meta div { margin-bottom: 2px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; position: relative; z-index: 2; }
                    th, td { padding: 6px; border-bottom: 1px solid #eee; font-size: 12px; text-align: left; }
                    th { font-weight: 600; background: #f9f9f9; color: #333; }
                    
                    .receipt-totals { border-top: 2px dashed #ccc; padding-top: 8px; position: relative; z-index: 2; }
                    .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #333; }
                    .summary-total { display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; border-top: 2px solid #333; margin-top: 8px; padding-top: 8px; }
                    
                    .qr-section { text-align: center; margin: 20px 0; padding: 10px; border: 1px solid #eee; border-radius: 8px; }
                    .qr-code { width: 90px; height: 90px; }
                    .qr-text { font-size: 11px; color: #666; }
                    
                    .receipt-terms { font-size: 11px; color: #666; margin-top: 20px; font-style: italic; text-align: center; white-space: pre-wrap; }
                    .receipt-footer { text-align: center; margin-top: 16px; padding-top: 12px; border-top: 2px dashed #ccc; color: #888; font-size: 12px; }
                    
                    @media print { body { padding: 0; } .receipt { padding: 16px; } }
                </style>
            </head>
            <body class="${layoutStyle}">
                ${receiptEl.outerHTML}
                <script>window.onload = function() { window.print(); }<\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    getEncodedUpiId(): string {
        return encodeURIComponent(this.settings?.bill_upi_id || '');
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
