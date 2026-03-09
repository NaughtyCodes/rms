import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MetaService, MetaField } from '../../../services/meta.service';

@Component({
  selector: 'app-meta-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './meta-setup.component.html',
  styleUrl: './meta-setup.component.css'
})
export class MetaSetupComponent implements OnInit {
  fields: MetaField[] = [];
  isLoading = false;
  message = '';

  // New field model
  newField: MetaField = {
    name: '',
    type: 'text',
    is_required: false,
    options: null
  };
  optionsText = ''; // To parse into arrays for 'select' types

  constructor(private metaService: MetaService) {}

  ngOnInit() {
    this.loadFields();
  }

  loadFields() {
    this.isLoading = true;
    this.metaService.getMetaFields().subscribe({
      next: (data) => {
        this.fields = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  addField() {
    if (!this.newField.name) return;
    
    // Parse options if select
    if (this.newField.type === 'select') {
      this.newField.options = this.optionsText.split(',').map(o => o.trim()).filter(o => o);
    } else {
      this.newField.options = null;
    }

    this.isLoading = true;
    this.metaService.createMetaField(this.newField).subscribe({
      next: (field) => {
        this.fields.push(field);
        this.newField = { name: '', type: 'text', is_required: false, options: null };
        this.optionsText = '';
        this.message = 'Field added successfully!';
        setTimeout(() => this.message = '', 3000);
        this.isLoading = false;
      },
      error: (err) => {
        this.message = err.error?.error || 'Failed to add field';
        this.isLoading = false;
      }
    });
  }

  deleteField(id: number, idx: number) {
    if (confirm('Are you sure you want to delete this field? Existing values will be lost.')) {
      this.metaService.deleteMetaField(id).subscribe({
        next: () => {
          this.fields.splice(idx, 1);
        },
        error: (err) => console.error(err)
      });
    }
  }
}
