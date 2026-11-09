import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonInput, IonButton, IonText, IonSpinner } from '@ionic/angular';
import { AuthService, RegisterData } from '../../services/auth';

interface Field {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'password' | 'number';
  error: string;
}

// Campos comunes (cliente y conductor)
const BASE: Field[] = [
  { name: 'name', label: 'Nombre completo', type: 'text', error: 'El nombre es obligatorio' },
  { name: 'email', label: 'Correo electrónico', type: 'email', error: 'Ingresa un correo válido' },
  { name: 'phone', label: 'Teléfono (10 dígitos)', type: 'tel', error: 'Ingresa un teléfono de 10 dígitos' },
  { name: 'password', label: 'Contraseña', type: 'password', error: 'Mínimo 8 caracteres' },
];

// Campos extra que pide la documentación para el conductor
const DRIVER: Field[] = [
  { name: 'license_number', label: 'Número de licencia', type: 'text', error: 'La licencia es obligatoria' },
  { name: 'plate', label: 'Placa del vehículo', type: 'text', error: 'La placa es obligatoria' },
  { name: 'brand', label: 'Marca', type: 'text', error: 'La marca es obligatoria' },
  { name: 'model', label: 'Modelo', type: 'text', error: 'El modelo es obligatorio' },
  { name: 'year', label: 'Año', type: 'number', error: 'Ingresa un año válido (1990 en adelante)' },
  { name: 'capacity', label: 'Capacidad (pasajeros)', type: 'number', error: 'Entre 1 y 10 pasajeros' },
  { name: 'color', label: 'Color (opcional)', type: 'text', error: '' },
];

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, IonContent, IonInput, IonButton, IonText, IonSpinner],
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  role = signal<'client' | 'driver'>('client');
  fields = computed(() => (this.role() === 'driver' ? [...BASE, ...DRIVER] : BASE));

  loading = signal(false);
  errorMessage = signal('');
  serverErrors = signal<Record<string, string[]>>({});

  form = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    license_number: [''],
    plate: [''],
    brand: [''],
    model: [''],
    year: [''],
    capacity: [''],
    color: [''],
  });

  // Cambia entre cliente y conductor: los campos del conductor solo se exigen si aplica
  setRole(r: 'client' | 'driver') {
    this.role.set(r);
    this.errorMessage.set('');
    this.serverErrors.set({});

    const maxYear = new Date().getFullYear() + 1;
    const rules: Record<string, ValidatorFn[]> = {
      license_number: [Validators.required],
      plate: [Validators.required],
      brand: [Validators.required],
      model: [Validators.required],
      year: [Validators.required, Validators.min(1990), Validators.max(maxYear)],
      capacity: [Validators.required, Validators.min(1), Validators.max(10)],
    };
    for (const f of DRIVER) {
      const c = this.form.get(f.name)!;
      c.setValidators(r === 'driver' ? (rules[f.name] ?? []) : []);
      c.updateValueAndValidity();
    }
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  // Mensaje de error de un campo: primero el del servidor (422), luego el de validación
  error(f: Field): string {
    const server = this.serverErrors()[f.name]?.[0];
    if (server) return server;
    return this.invalid(f.name) ? f.error : '';
  }

  onSubmit() {
    this.errorMessage.set('');
    this.serverErrors.set({});

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue() as Record<string, any>;
    const data: RegisterData = {
      name: v['name'],
      email: v['email'],
      phone: v['phone'],
      password: v['password'],
      role: this.role(),
    };
    if (this.role() === 'driver') {
      Object.assign(data, {
        license_number: v['license_number'],
        plate: String(v['plate']).toUpperCase(),
        brand: v['brand'],
        model: v['model'],
        year: Number(v['year']),
        capacity: Number(v['capacity']),
        color: v['color'] || undefined,
      });
    }

    this.loading.set(true);
    this.auth.register(data).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.router.navigateByUrl(this.auth.homeFor(res.user.role));
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 422) {
          this.serverErrors.set(err.error.errors || {});
          this.errorMessage.set('Revisa los datos ingresados.');
        } else {
          this.errorMessage.set('No se pudo conectar con el servidor.');
        }
      },
    });
  }

  goToLogin() {
    this.router.navigateByUrl('/login');
  }
}
