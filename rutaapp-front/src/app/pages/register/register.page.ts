import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonInput, IonButton, IonText, IonSpinner,
} from '@ionic/angular';
import { AuthService } from '../../services/auth';


@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonHeader, 
    ReactiveFormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonInput, IonButton, IonText, IonSpinner,
  ],
})

export class RegisterPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal('');
  serverErrors = signal<Record<string, string[]>>({});

  form = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  // Devuelve true si el campo fue tocado y tiene un error de validación
  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

    onSubmit() {
    this.errorMessage.set('');
    this.serverErrors.set({});

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.auth.register(this.form.getRawValue() as any).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/home');
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
}