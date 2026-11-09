import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonInput, IonButton, IonText, IonSpinner } from '@ionic/angular';
import { AdminService } from '../../services/admin';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';

interface Field {
  name: string;
  label: string;
  type: 'text' | 'number';
  error: string;
}

const FIELDS: Field[] = [
  { name: 'name', label: 'Nombre de la tarifa', type: 'text', error: 'El nombre es obligatorio' },
  { name: 'base_fare', label: 'Tarifa base (COP)', type: 'number', error: 'Debe ser un número mayor o igual a 0' },
  { name: 'price_per_km', label: 'Precio por km (COP)', type: 'number', error: 'Debe ser un número mayor o igual a 0' },
  { name: 'price_per_minute', label: 'Precio por minuto (COP)', type: 'number', error: 'Debe ser un número mayor o igual a 0' },
  { name: 'minimum_fare', label: 'Tarifa mínima (COP)', type: 'number', error: 'Debe ser un número mayor o igual a 0' },
  { name: 'surge_multiplier', label: 'Multiplicador (1 o más)', type: 'number', error: 'Debe ser 1 o más' },
];

@Component({
  selector: 'app-admin-fares',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, IonContent, IonInput, IonButton, IonText, IonSpinner, StatusBadgeComponent],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <h1 class="page-title">Tarifas</h1>

        <div class="panel">
          <h2>Tarifas configuradas</h2>
          @if (loading()) {
            <p class="center"><ion-spinner name="dots"></ion-spinner></p>
          } @else if (fares().length === 0) {
            <p class="muted">Todavía no hay tarifas.</p>
          } @else {
            <div class="table-wrap">
              <table class="tbl">
                <thead>
                  <tr><th>Nombre</th><th>Base</th><th>Por km</th><th>Por minuto</th><th>Mínima</th><th>Multiplicador</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  @for (f of fares(); track f.id) {
                    <tr>
                      <td><strong>{{ f.name }}</strong></td>
                      <td>$ {{ f.base_fare | number }}</td>
                      <td>$ {{ f.price_per_km | number }}</td>
                      <td>$ {{ f.price_per_minute | number }}</td>
                      <td>$ {{ f.minimum_fare | number }}</td>
                      <td>× {{ f.surge_multiplier }}</td>
                      <td><app-status-badge [status]="f.active ? 'active' : 'inactive'" /></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <div class="panel">
          <h2>Crear tarifa</h2>
          <p class="muted">Si la marcas como activa, reemplaza a la tarifa activa actual.</p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="grid">
              @for (f of fields; track f.name) {
                <div class="cell">
                  <ion-input [label]="f.label" labelPlacement="floating" fill="outline"
                    [type]="f.type" [formControlName]="f.name"></ion-input>
                  @if (error(f); as msg) { <ion-text color="danger"><small>{{ msg }}</small></ion-text> }
                </div>
              }
            </div>

            <label class="check">
              <input type="checkbox" formControlName="active" /> Activar esta tarifa ahora
            </label>

            @if (message()) { <p class="msg" [class.err]="isError()">{{ message() }}</p> }

            <ion-button [disabled]="saving()" type="submit">
              @if (saving()) { <ion-spinner name="dots"></ion-spinner> } @else { Crear tarifa }
            </ion-button>
          </form>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .center { text-align: center; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 14px 0; }
    .cell { display: flex; flex-direction: column; gap: 4px; }
    .check { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 14px; cursor: pointer; }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
  `],
})
export class AdminFaresPage implements OnInit {
  private admin = inject(AdminService);
  private fb = inject(FormBuilder);

  fields = FIELDS;
  fares = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  message = signal('');
  isError = signal(false);
  serverErrors = signal<Record<string, string[]>>({});

  form = this.fb.group({
    name: ['', [Validators.required]],
    base_fare: ['', [Validators.required, Validators.min(0)]],
    price_per_km: ['', [Validators.required, Validators.min(0)]],
    price_per_minute: ['', [Validators.required, Validators.min(0)]],
    minimum_fare: ['', [Validators.required, Validators.min(0)]],
    surge_multiplier: ['1', [Validators.required, Validators.min(1)]],
    active: [true],
  });

  ngOnInit() {
    this.load();
  }

  // GET /admin/fares
  private load() {
    this.admin.fares().subscribe({
      next: (res) => {
        this.fares.set(res.fares);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  error(f: Field): string {
    const server = this.serverErrors()[f.name]?.[0];
    if (server) return server;
    return this.invalid(f.name) ? f.error : '';
  }

  // POST /admin/fares
  onSubmit() {
    this.message.set('');
    this.serverErrors.set({});

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue() as Record<string, any>;
    const body = {
      name: v['name'],
      base_fare: Number(v['base_fare']),
      price_per_km: Number(v['price_per_km']),
      price_per_minute: Number(v['price_per_minute']),
      minimum_fare: Number(v['minimum_fare']),
      surge_multiplier: Number(v['surge_multiplier']),
      active: !!v['active'],
    };

    this.saving.set(true);
    this.admin.createFare(body).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.isError.set(false);
        this.message.set(res.message || 'Tarifa configurada exitosamente');
        this.form.reset({ name: '', base_fare: '', price_per_km: '', price_per_minute: '', minimum_fare: '', surge_multiplier: '1', active: true });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.isError.set(true);
        if (err.status === 422) {
          this.serverErrors.set(err.error.errors || {});
          this.message.set('Revisa los datos ingresados.');
        } else {
          this.message.set(err.error?.message || 'No se pudo crear la tarifa.');
        }
      },
    });
  }
}
