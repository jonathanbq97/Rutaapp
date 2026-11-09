import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-stats-row',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="stats">
      <div class="stat">
        <span class="n">{{ summary()?.services_completed ?? 0 }}</span>
        <span class="l">Servicios realizados</span>
      </div>
      <div class="stat">
        <span class="n">$ {{ (summary()?.total_income ?? 0) | number }}</span>
        <span class="l">Ingresos acumulados</span>
      </div>
      <div class="stat">
        <span class="n">⭐ {{ summary()?.rating_average ?? '—' }}</span>
        <span class="l">Calificación promedio</span>
      </div>
      <div class="stat">
        <span class="n">{{ summary()?.services_cancelled ?? 0 }}</span>
        <span class="l">Servicios cancelados</span>
      </div>
    </div>
  `,
  styles: [`
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
    .stat {
      display: flex; flex-direction: column; gap: 4px; padding: 18px;
      border-radius: 22px; background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.16);
    }
    .n { font-size: 24px; font-weight: 800; color: #60a5fa; }
    .l { font-size: 13px; opacity: 0.7; }
    @media (max-width: 800px) { .stats { grid-template-columns: 1fr 1fr; } }
  `],
})
export class StatsRowComponent {
  summary = input<any>(null);
}
