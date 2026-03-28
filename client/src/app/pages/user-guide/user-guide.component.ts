import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
    selector: 'app-user-guide',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="guide-container">
            <div class="guide-toolbar">
                <button class="back-btn" (click)="goBack()">
                    ← Go Back
                </button>
                <span class="guide-title">User Guide</span>
            </div>
            <iframe [src]="guideSrc" class="guide-frame"></iframe>
        </div>
    `,
    styles: [`
        .guide-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            z-index: 999;
            background: #F8F9FA;
            display: flex;
            flex-direction: column;
        }
        .guide-toolbar {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 12px 24px;
            background: #FFFFFF;
            border-bottom: 1px solid #E5E7EB;
            flex-shrink: 0;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .back-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 20px;
            background: #FFFFFF;
            color: #4F46E5;
            border: 1.5px solid #4F46E5;
            border-radius: 8px;
            font-family: 'Outfit', 'Inter', sans-serif;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .back-btn:hover {
            background: #EEF2FF;
            color: #4338CA;
            border-color: #4338CA;
        }
        .back-btn:active {
            transform: scale(0.97);
        }
        .guide-title {
            font-family: 'Outfit', sans-serif;
            font-size: 16px;
            font-weight: 600;
            color: #1F2937;
        }
        .guide-frame {
            flex: 1;
            width: 100%;
            border: none;
        }
    `]
})
export class UserGuideComponent {
    guideSrc: SafeResourceUrl;

    constructor(
        private sanitizer: DomSanitizer,
        private router: Router
    ) {
        this.guideSrc = this.sanitizer.bypassSecurityTrustResourceUrl('https://naughtycodes.github.io/tractly/user_guide.html');
    }

    goBack() {
        this.router.navigate(['/dashboard']);
    }
}
