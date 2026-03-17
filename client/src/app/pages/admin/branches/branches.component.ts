import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchService, Branch } from '../../../services/branch.service';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.css'
})
export class BranchesComponent implements OnInit {
  branches: Branch[] = [];
  isModalOpen = false;
  editingBranch: Partial<Branch> | null = null;
  errorMessage = '';

  constructor(private branchService: BranchService) { }

  ngOnInit(): void {
    this.loadBranches();
  }

  loadBranches() {
    this.branchService.getBranches().subscribe({
      next: (data) => this.branches = data,
      error: (err) => this.errorMessage = err.error?.error || 'Failed to load branches'
    });
  }

  openModal(branch?: Branch) {
    if (branch) {
      this.editingBranch = { ...branch };
    } else {
      this.editingBranch = { name: '', address: '', phone: '', is_warehouse: 0, is_active: 1 };
    }
    this.isModalOpen = true;
    this.errorMessage = '';
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingBranch = null;
  }

  saveBranch() {
    if (!this.editingBranch?.name) {
      this.errorMessage = 'Branch name is required';
      return;
    }

    if (this.editingBranch.id) {
      this.branchService.updateBranch(this.editingBranch.id, this.editingBranch).subscribe({
        next: () => {
          this.loadBranches();
          this.closeModal();
        },
        error: (err) => this.errorMessage = err.error?.error || 'Failed to update branch'
      });
    } else {
      this.branchService.createBranch(this.editingBranch).subscribe({
        next: () => {
          this.loadBranches();
          this.closeModal();
        },
        error: (err) => this.errorMessage = err.error?.error || 'Failed to create branch'
      });
    }
  }

  toggleWarehouse(e: Event) {
    const isChecked = (e.target as HTMLInputElement).checked;
    if (this.editingBranch) {
        this.editingBranch.is_warehouse = isChecked ? 1 : 0;
    }
  }

  toggleActive(e: Event) {
    const isChecked = (e.target as HTMLInputElement).checked;
    if (this.editingBranch) {
        this.editingBranch.is_active = isChecked ? 1 : 0;
    }
  }
}
