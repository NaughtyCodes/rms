import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent {
    username = '';
    password = '';
    error = '';
    loading = false;

    constructor(private auth: AuthService, private router: Router) {
        if (auth.isLoggedIn()) this.router.navigate(['/dashboard']);
    }

    onLogin() {
        if (!this.username || !this.password) {
            this.error = 'Please enter username and password';
            return;
        }
        this.loading = true;
        this.error = '';
        this.auth.login(this.username, this.password).subscribe({
            next: () => this.router.navigate(['/dashboard']),
            error: (err) => {
                this.error = err.error?.error || 'Login failed';
                this.loading = false;
            }
        });
    }
}
