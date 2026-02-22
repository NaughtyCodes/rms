import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface User {
    id: number;
    username: string;
    role: string;
    fullName: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private currentUser = new BehaviorSubject<User | null>(null);
    currentUser$ = this.currentUser.asObservable();

    constructor(private http: HttpClient, private router: Router) {
        const stored = localStorage.getItem('user');
        if (stored) {
            this.currentUser.next(JSON.parse(stored));
        }
    }

    login(username: string, password: string): Observable<LoginResponse> {
        return this.http.post<LoginResponse>('/api/auth/login', { username, password }).pipe(
            tap(res => {
                localStorage.setItem('token', res.token);
                localStorage.setItem('user', JSON.stringify(res.user));
                this.currentUser.next(res.user);
            })
        );
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUser.next(null);
        this.router.navigate(['/login']);
    }

    isLoggedIn(): boolean {
        return !!localStorage.getItem('token');
    }

    getUser(): User | null {
        return this.currentUser.value;
    }

    isAdmin(): boolean {
        return this.currentUser.value?.role === 'admin';
    }
}
