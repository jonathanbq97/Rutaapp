import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonInput, IonButton, IonText, IonSpinner } from '@ionic/angular';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, IonContent, IonInput, IonButton, IonText, IonSpinner],
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal('');

  form = this.fb.group({
    login: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  onSubmit() {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { login, password } = this.form.getRawValue();

    this.auth.login(login!, password!).subscribe({
      next: (res) => {
        this.loading.set(false);
        // Cada rol entra a su propio panel
        this.router.navigateByUrl(this.auth.homeFor(res.user.role));
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Correo o contraseña incorrectos.');
        } else if (err.status === 403) {
          this.errorMessage.set(err.error?.message || 'Tu cuenta está inactiva o suspendida.');
        } else if (err.status === 422) {
          this.errorMessage.set('Completa todos los campos.');
        } else {
          this.errorMessage.set('No se pudo conectar con el servidor.');
        }
      },
    });
  }

  goToRegister() {
    this.router.navigateByUrl('/register');
  }

  goToForgotPassword() {
    this.router.navigateByUrl('/forgot-password');
  }
}
