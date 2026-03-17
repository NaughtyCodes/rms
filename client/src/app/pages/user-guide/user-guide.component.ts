import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
    selector: 'app-user-guide',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="guide-container">
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
            background: #f1f5f9;
        }
        .guide-frame {
            width: 100%;
            height: 100%;
            border: none;
        }
    `]
})
export class UserGuideComponent {
    guideSrc: SafeResourceUrl;

    constructor(private sanitizer: DomSanitizer) {
        this.guideSrc = this.sanitizer.bypassSecurityTrustResourceUrl('/assets/docs/user_guide.html');
    }
}
