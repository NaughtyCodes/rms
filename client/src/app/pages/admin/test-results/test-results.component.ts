import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-test-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-results.component.html',
  styleUrl: './test-results.component.css'
})
export class TestResultsComponent implements OnInit {
  results: any = null;
  error: string | null = null;
  loading = true;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get('/assets/test-results.json').subscribe({
      next: (data) => {
        this.results = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'No test results found. Please run the Playwright tests to generate the report.';
        this.loading = false;
      }
    });
  }

  getSpecs(suites: any[]): any[] {
    let specs: any[] = [];
    const traverse = (s: any) => {
      if (s.specs) specs = specs.concat(s.specs);
      if (s.suites) s.suites.forEach(traverse);
    };
    if (suites) suites.forEach(traverse);
    return specs;
  }
}
