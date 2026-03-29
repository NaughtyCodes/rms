import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface UserRole {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  branch_id?: number;
  roles: UserRole[];
  selected?: boolean;
}

interface Role {
  id: number;
  name: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  roles: Role[] = [];
  branches: any[] = [];
  
  showModal = false;
  editingUser: any = null;
  userForm = {
    username: '',
    password: '',
    fullName: '',
    branchId: null as number | null,
    roleIds: [] as number[]
  };

  showBulkRoleModal = false;
  bulkRoleIds: number[] = [];
  selectAll = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.http.get<User[]>('/api/user-management').subscribe(data => this.users = data);
    this.http.get<Role[]>('/api/roles').subscribe(data => this.roles = data);
    this.http.get<any[]>('/api/branches').subscribe(data => this.branches = data);
  }

  openAddModal() {
    this.editingUser = null;
    this.userForm = { username: '', password: '', fullName: '', branchId: null, roleIds: [] };
    this.showModal = true;
  }

  editUser(user: User) {
    this.editingUser = user;
    this.userForm = {
      username: user.username,
      password: '',
      fullName: user.fullName,
      branchId: user.branch_id || null,
      roleIds: user.roles.map(r => r.id)
    };
    this.showModal = true;
  }

  saveUser() {
    if (this.editingUser) {
      this.http.put(`/api/user-management/${this.editingUser.id}`, this.userForm).subscribe(() => {
        this.loadData();
        this.showModal = false;
      });
    } else {
      this.http.post('/api/user-management', this.userForm).subscribe(() => {
        this.loadData();
        this.showModal = false;
      });
    }
  }

  deleteUser(id: number) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.http.delete(`/api/user-management/${id}`).subscribe(() => this.loadData());
    }
  }

  toggleSelectAll() {
    this.users.forEach(u => u.selected = this.selectAll);
  }

  get selectedUserCount() {
    return this.users.filter(u => u.selected).length;
  }

  openBulkRole() {
    this.bulkRoleIds = [];
    this.showBulkRoleModal = true;
  }

  applyBulkRoles() {
    const userIds = this.users.filter(u => u.selected).map(u => u.id);
    this.http.post('/api/user-management/bulk-role-assign', {
      userIds,
      roleIds: this.bulkRoleIds,
      action: 'set' 
    }).subscribe(() => {
      this.loadData();
      this.showBulkRoleModal = false;
      this.selectAll = false;
      this.users.forEach(u => u.selected = false);
    });
  }

  toggleRoleSelection(roleId: number) {
    const index = this.userForm.roleIds.indexOf(roleId);
    if (index > -1) this.userForm.roleIds.splice(index, 1);
    else this.userForm.roleIds.push(roleId);
  }

  toggleBulkRoleSelection(roleId: number) {
    const index = this.bulkRoleIds.indexOf(roleId);
    if (index > -1) this.bulkRoleIds.splice(index, 1);
    else this.bulkRoleIds.push(roleId);
  }

  isRoleSelected(roleId: number) {
    return this.userForm.roleIds.includes(roleId);
  }

  isBulkRoleSelected(roleId: number) {
    return this.bulkRoleIds.includes(roleId);
  }
}
