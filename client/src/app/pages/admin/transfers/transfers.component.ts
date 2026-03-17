import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransferService, StockTransfer, TransferItem } from '../../../services/transfer.service';
import { BranchService, Branch } from '../../../services/branch.service';
import { InventoryService, Product } from '../../../services/inventory.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transfers.component.html',
  styleUrl: './transfers.component.css'
})
export class TransfersComponent implements OnInit {
  transfers: StockTransfer[] = [];
  branches: Branch[] = [];
  products: Product[] = [];
  
  isModalOpen = false;
  newTransfer: Partial<StockTransfer> = this.getEmptyTransfer();
  
  errorMessage = '';
  successMessage = '';
  
  userRole = '';
  userBranchId: number | null = null;

  constructor(
    private transferService: TransferService,
    private branchService: BranchService,
    private inventoryService: InventoryService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.userRole = user?.role || '';
    this.userBranchId = user?.branchId || null;
    
    this.loadData();
  }

  getEmptyTransfer(): Partial<StockTransfer> {
    return {
      from_branch_id: 0,
      to_branch_id: 0,
      status: 'pending',
      notes: '',
      items: []
    };
  }

  loadData() {
    this.transferService.getTransfers().subscribe({
      next: (data) => this.transfers = data,
      error: (err) => this.errorMessage = 'Failed to load transfers'
    });

    this.branchService.getBranches().subscribe({
      next: (data) => this.branches = data
    });

    // Only needed for creating new transfers, could lazy load
    this.inventoryService.getProducts({ limit: 1000 }).subscribe({
      next: (res) => this.products = res.products
    });
  }

  openNewTransferModal() {
    this.newTransfer = this.getEmptyTransfer();
    if (this.userBranchId) {
       this.newTransfer.to_branch_id = this.userBranchId; // Assuming cashier requests stock TO their branch
    }
    this.addItem();
    this.isModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeModal() {
    this.isModalOpen = false;
  }

  addItem() {
    this.newTransfer.items?.push({ product_id: 0, quantity: 1 });
  }

  removeItem(index: number) {
    this.newTransfer.items?.splice(index, 1);
  }

  submitTransfer() {
    if (!this.newTransfer.from_branch_id || !this.newTransfer.to_branch_id) {
      this.errorMessage = 'Please select source and destination branches';
      return;
    }
    
    if (this.newTransfer.from_branch_id === this.newTransfer.to_branch_id) {
      this.errorMessage = 'Source and destination branches cannot be the same';
      return;
    }

    const validItems = this.newTransfer.items?.filter(i => i.product_id > 0 && i.quantity > 0);
    if (!validItems || validItems.length === 0) {
      this.errorMessage = 'Please add at least one valid product';
      return;
    }
    
    this.newTransfer.items = validItems;

    this.transferService.createTransfer(this.newTransfer).subscribe({
      next: () => {
        this.loadData();
        this.closeModal();
      },
      error: (err) => this.errorMessage = err.error?.error || 'Failed to submit transfer request'
    });
  }

  updateStatus(id: number | undefined, status: string) {
    if (!id) return;
    this.transferService.updateTransferStatus(id, status).subscribe({
      next: (res) => {
        this.successMessage = res.message;
        this.loadData();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Update failed';
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  // Helpers
  canShip(t: StockTransfer): boolean {
    return t.status === 'pending' && (this.userRole === 'admin' || this.userBranchId === t.from_branch_id);
  }

  canReceive(t: StockTransfer): boolean {
    return t.status === 'shipped' && (this.userRole === 'admin' || this.userBranchId === t.to_branch_id);
  }

  canCancel(t: StockTransfer): boolean {
    return t.status === 'pending' && (this.userRole === 'admin' || this.userBranchId === t.from_branch_id || this.userBranchId === t.to_branch_id);
  }
}
