import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonInput, IonButton, IonText, IonSpinner } from '@ionic/angular';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, IonContent, IonInput, IonButton, IonText, IonSpinner],
})
export class ForgotPasswordPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  onSubmit() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { email, newPassword } = this.form.getRawValue();

    this.auth.forgotPassword(email!, newPassword!).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.successMessage.set(res.message);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.errorMessage.set('No existe una cuenta con ese correo.');
        } else if (err.status === 422) {
          this.errorMessage.set('Revisa el correo y la contraseña (mínimo 8 caracteres).');
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
