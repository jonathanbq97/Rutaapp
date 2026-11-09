import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IonContent, IonSpinner } from '@ionic/angular';
import { DriverService } from '../../services/driver';
import { StatsRowComponent } from '../../components/stats-row/stats-row.component';

@Component({
  selector: 'app-driver-income',
  standalone: true,
  imports: [DatePipe, IonContent, IonSpinner, StatsRowComponent],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <h1 class="page-title">Ingresos y calificaciones</h1>

        <app-stats-row [summary]="summary()" />

        <div class="panel">
          <h2>Calificaciones recibidas</h2>
          @if (loading()) {
            <p class="center"><ion-spinner name="dots"></ion-spinner></p>
          } @else if (ratings().length === 0) {
            <p class="muted">Todavía no has recibido calificaciones.</p>
          } @else {
            @for (r of ratings(); track r.id) {
              <div class="rating">
                <div class="row between">
                  <span class="stars">{{ stars(r.score) }}</span>
                  <small class="muted">{{ r.created_at | date: 'dd/MM/yyyy' }} · {{ r.client?.name }}</small>
                </div>
                @if (r.comment) { <p class="comment">{{ r.comment }}</p> }
              </div>
            }
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .center { text-align: center; }
    .rating { padding: 14px 0; border-top: 1px solid rgba(255, 255, 255, 0.1); }
    .stars { color: #fbbf24; letter-spacing: 2px; }
    .comment { margin: 6px 0 0; font-size: 14px; opacity: 0.85; }
  `],
})
export class DriverIncomePage implements OnInit {
  private driver = inject(DriverService);

  summary = signal<any>(null);
  ratings = signal<any[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.driver.getSummary().subscribe({ next: (r) => this.summary.set(r.summary), error: () => {} });
    // GET /driver/ratings
    this.driver.getRatings().subscribe({
      next: (r) => {
        this.ratings.set(r.ratings);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  stars(score: number) {
    return '★'.repeat(score) + '☆'.repeat(5 - score);
  }
}
