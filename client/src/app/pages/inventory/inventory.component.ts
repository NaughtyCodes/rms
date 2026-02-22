import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, Product, Category } from '../../services/inventory.service';

@Component({
    selector: 'app-inventory',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './inventory.component.html',
    styleUrl: './inventory.component.css'
})
export class InventoryComponent implements OnInit {
    products: Product[] = [];
    categories: Category[] = [];
    total = 0;
    search = '';
    selectedCategory = '';
    loading = true;

    // Modal state
    showModal = false;
    editMode = false;
    saving = false;
    form: Partial<Product> = {};

    // Category modal
    showCatModal = false;
    catForm = { id: 0, name: '', description: '' };
    catEditMode = false;

    toast = { show: false, message: '', type: 'success' };

    constructor(private inventoryService: InventoryService) { }

    ngOnInit() {
        this.loadProducts();
        this.loadCategories();
    }

    loadProducts() {
        this.loading = true;
        const params: any = { limit: 100 };
        if (this.search) params.search = this.search;
        if (this.selectedCategory) params.category_id = this.selectedCategory;

        this.inventoryService.getProducts(params).subscribe({
            next: (res) => { this.products = res.products; this.total = res.total; this.loading = false; },
            error: () => { this.loading = false; }
        });
    }

    loadCategories() {
        this.inventoryService.getCategories().subscribe({ next: (res) => this.categories = res });
    }

    onSearch() { this.loadProducts(); }

    openAddModal() {
        this.editMode = false;
        this.form = { quantity: 0, low_stock_threshold: 5, unit: 'pcs', cost_price: 0, selling_price: 0 };
        this.showModal = true;
    }

    openEditModal(p: Product) {
        this.editMode = true;
        this.form = { ...p };
        this.showModal = true;
    }

    saveProduct() {
        this.saving = true;
        const obs = this.editMode
            ? this.inventoryService.updateProduct(this.form.id!, this.form)
            : this.inventoryService.createProduct(this.form);

        obs.subscribe({
            next: () => {
                this.showModal = false;
                this.saving = false;
                this.loadProducts();
                this.showToast(this.editMode ? 'Product updated' : 'Product added', 'success');
            },
            error: (err) => {
                this.saving = false;
                this.showToast(err.error?.error || 'Failed to save', 'error');
            }
        });
    }

    deleteProduct(p: Product) {
        if (!confirm(`Delete "${p.name}"?`)) return;
        this.inventoryService.deleteProduct(p.id).subscribe({
            next: () => { this.loadProducts(); this.showToast('Product deleted', 'success'); },
            error: () => this.showToast('Failed to delete', 'error')
        });
    }

    // Category CRUD
    openAddCatModal() {
        this.catEditMode = false;
        this.catForm = { id: 0, name: '', description: '' };
        this.showCatModal = true;
    }

    editCategory(c: Category) {
        this.catEditMode = true;
        this.catForm = { ...c };
        this.showCatModal = true;
    }

    saveCategory() {
        const obs = this.catEditMode
            ? this.inventoryService.updateCategory(this.catForm.id, this.catForm.name, this.catForm.description)
            : this.inventoryService.createCategory(this.catForm.name, this.catForm.description);

        obs.subscribe({
            next: () => {
                this.showCatModal = false;
                this.loadCategories();
                this.showToast(this.catEditMode ? 'Category updated' : 'Category added', 'success');
            },
            error: (err) => this.showToast(err.error?.error || 'Failed', 'error')
        });
    }

    deleteCategory(c: Category) {
        if (!confirm(`Delete category "${c.name}"?`)) return;
        this.inventoryService.deleteCategory(c.id).subscribe({
            next: () => { this.loadCategories(); this.showToast('Category deleted', 'success'); },
            error: () => this.showToast('Failed to delete', 'error')
        });
    }

    showToast(message: string, type: string) {
        this.toast = { show: true, message, type };
        setTimeout(() => this.toast.show = false, 3000);
    }

    getCategoryName(id: number): string {
        return this.categories.find(c => c.id === id)?.name || '—';
    }

    isLowStock(p: Product): boolean {
        return p.quantity <= p.low_stock_threshold;
    }
}
