import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Permission {
  id: number;
  name: string;
  category: string;
  description: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  is_system_role: boolean;
  permissions: string[];
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.css']
})
export class RolesComponent implements OnInit {
  roles: Role[] = [];
  groupedPermissions: { [key: string]: Permission[] } = {};
  permissionCategories: string[] = [];

  showModal = false;
  editingRole: Role | null = null;
  roleForm = {
    name: '',
    description: '',
    permissions: [] as string[]
  };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadRoles();
    this.loadPermissions();
  }

  loadRoles() {
    this.http.get<Role[]>('/api/roles').subscribe(data => this.roles = data);
  }

  loadPermissions() {
    this.http.get<{ [key: string]: Permission[] }>('/api/permissions').subscribe(data => {
      this.groupedPermissions = data;
      this.permissionCategories = Object.keys(data);
    });
  }

  openAddModal() {
    this.editingRole = null;
    this.roleForm = { name: '', description: '', permissions: [] };
    this.showModal = true;
  }

  editRole(role: Role) {
    this.editingRole = role;
    this.roleForm = {
      name: role.name,
      description: role.description,
      permissions: [...role.permissions]
    };
    this.showModal = true;
  }

  saveRole() {
    if (this.editingRole) {
      this.http.put(`/api/roles/${this.editingRole.id}`, this.roleForm).subscribe(() => {
        this.loadRoles();
        this.showModal = false;
      });
    } else {
      this.http.post('/api/roles', this.roleForm).subscribe(() => {
        this.loadRoles();
        this.showModal = false;
      });
    }
  }

  deleteRole(id: number) {
    if (confirm('Are you sure you want to delete this role?')) {
      this.http.delete(`/api/roles/${id}`).subscribe(() => this.loadRoles());
    }
  }

  togglePermission(pName: string) {
    const index = this.roleForm.permissions.indexOf(pName);
    if (index > -1) this.roleForm.permissions.splice(index, 1);
    else this.roleForm.permissions.push(pName);
  }

  isPermissionSelected(pName: string) {
    return this.roleForm.permissions.includes(pName);
  }
}
