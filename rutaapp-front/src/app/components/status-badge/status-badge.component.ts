import { Component, computed, input } from '@angular/core';

const LABELS: Record<string, string> = {
  // Viajes y solicitudes
  requested: 'Solicitado',
  assigned: 'Asignado',
  driver_arrived: 'Conductor llegó',
  in_progress: 'En curso',
  completed: 'Completado',
  cancelled: 'Cancelado',
  // Aprobación de conductores
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
  // Tarifas
  active: 'Activa',
  inactive: 'Inactiva',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="b" [attr.data-s]="status()">{{ label() }}</span>`,
  styles: [`
    .b {
      display: inline-block; padding: 5px 12px; font-size: 13px; font-weight: 600;
      border-radius: 999px; white-space: nowrap;
      background: rgba(47, 107, 255, 0.25); border: 1px solid rgba(96, 165, 250, 0.6);
    }
    .b[data-s='assigned'], .b[data-s='driver_arrived'], .b[data-s='completed'],
    .b[data-s='approved'], .b[data-s='active'] {
      background: rgba(34, 197, 94, 0.2); border-color: rgba(74, 222, 128, 0.6);
    }
    .b[data-s='in_progress'], .b[data-s='pending'] {
      background: rgba(255, 122, 26, 0.2); border-color: rgba(255, 160, 90, 0.7);
    }
    .b[data-s='cancelled'], .b[data-s='rejected'], .b[data-s='suspended'] {
      background: rgba(239, 68, 68, 0.2); border-color: rgba(248, 113, 113, 0.6);
    }
    .b[data-s='inactive'] {
      background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.25);
    }
  `],
})
export class StatusBadgeComponent {
  status = input.required<string>();
  label = computed(() => LABELS[this.status()] ?? this.status());
}
