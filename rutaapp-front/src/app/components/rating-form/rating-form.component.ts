import { Component, inject, input, output, signal } from '@angular/core';
import { IonButton, IonSpinner } from '@ionic/angular';
import { RideService } from '../../services/ride';

@Component({
  selector: 'app-rating-form',
  standalone: true,
  imports: [IonButton, IonSpinner],
  template: `
    @if (sent()) {
      <div class="thanks">
        <h3>¡Gracias por tu calificación!</h3>
        <p class="muted">Tus comentarios ayudan a mejorar el servicio.</p>
      </div>
    } @else {
      <div class="rf">
        <p class="muted">¿Cómo estuvo tu viaje?</p>
        <div class="stars">
          @for (n of nums; track n) {
            <button type="button" class="star" [class.on]="n <= score()" (click)="score.set(n)">★</button>
          }
        </div>

        <textarea class="ctl area" rows="3" placeholder="Cuéntanos tu experiencia (opcional)"
          (input)="comment.set($any($event.target).value)"></textarea>

        <label class="check">
          <input type="checkbox" [checked]="incident()" (change)="incident.set($any($event.target).checked)" />
          Tuve un problema durante el servicio (reportar incidencia)
        </label>

        @if (message()) { <p class="err">{{ message() }}</p> }

        <ion-button expand="block" [disabled]="busy()" (click)="submit()">
          @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { Enviar calificación }
        </ion-button>
      </div>
    }
  `,
  styles: [`
    .muted { margin: 0 0 8px; font-size: 14px; opacity: 0.7; }
    .stars { display: flex; gap: 6px; margin-bottom: 12px; }
    .star { font-size: 34px; line-height: 1; color: rgba(255, 255, 255, 0.25); background: transparent; border: 0; cursor: pointer; padding: 0; }
    .star.on { color: #fbbf24; }
    .area { width: 100%; box-sizing: border-box; resize: vertical; margin-bottom: 12px; }
    .check { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 14px; cursor: pointer; }
    .err { margin: 0 0 12px; font-size: 14px; color: #f87171; }
    .thanks h3 { margin: 0 0 4px; }
  `],
})
export class RatingFormComponent {
  private rides = inject(RideService);

  tripId = input.required<number>();
  rated = output<void>();

  nums = [1, 2, 3, 4, 5];
  score = signal(0);
  comment = signal('');
  incident = signal(false);
  busy = signal(false);
  sent = signal(false);
  message = signal('');

  // POST /client/trips/{id}/rating
  submit() {
    this.message.set('');
    if (this.score() < 1) {
      this.message.set('Elige de 1 a 5 estrellas.');
      return;
    }
    this.busy.set(true);
    this.rides
      .rate(this.tripId(), {
        score: this.score(),
        comment: this.comment().trim(),
        has_incident: this.incident(),
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.sent.set(true);
          this.rated.emit();
        },
        error: (err) => {
          this.busy.set(false);
          this.message.set(err.error?.message || 'No se pudo enviar la calificación.');
        },
      });
  }
}
