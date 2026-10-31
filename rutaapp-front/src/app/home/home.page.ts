import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonSelect, IonSelectOption, IonButton, IonButtons,
  IonText, IonSpinner, IonCard, IonCardContent,
} from '@ionic/angular';
import { AuthService } from '../services/auth';
import { FareService } from '../services/fare';

interface Place {
  name: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    ReactiveFormsModule, DecimalPipe,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonSelect, IonSelectOption, IonButton, IonButtons,
    IonText, IonSpinner, IonCard, IonCardContent,
  ],
})
export class HomePage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private fareService = inject(FareService);
  private router = inject(Router);

   places: Place[] = [
    { name: 'Parque Santander', lat: 2.9273, lng: -75.2893 },
    { name: 'Terminal de Transportes', lat: 2.9407, lng: -75.2897 },
    { name: 'Aeropuerto Benito Salas', lat: 2.95, lng: -75.2944 },
    { name: 'Universidad Surcolombiana', lat: 2.9422, lng: -75.2878 },
    { name: 'Malecón del Río Magdalena', lat: 2.9355, lng: -75.2748 },
    { name: 'Centro Comercial San Pedro Plaza', lat: 2.9332, lng: -75.2815 },
  ];

  loading = signal(false);
  errorMessage = signal('');
  estimate = signal<any>(null);

  form = this.fb.group({
    origin: ['', [Validators.required]],
    destination: ['', [Validators.required]],
  });

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  onSubmit() {
    this.errorMessage.set('');
    this.estimate.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { origin, destination } = this.form.getRawValue();
    if (origin === destination) {
      this.errorMessage.set('El origen y el destino no pueden ser el mismo lugar.');
      return;
    }

    const o = this.places.find((p) => p.name === origin)!;
    const d = this.places.find((p) => p.name === destination)!;

    this.loading.set(true);
    this.fareService
      .estimateFare({
        origin_latitude: o.lat,
        origin_longitude: o.lng,
        destination_latitude: d.lat,
        destination_longitude: d.lng,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.estimate.set(res.estimate);
        },
        error: (err) => {
          this.loading.set(false);
          if (err.status === 401) {
            this.logout();
          } else if (err.status === 422) {
            this.errorMessage.set('La ubicación ingresada no es válida.');
          } else {
            this.errorMessage.set('No se pudo calcular la tarifa. Intenta de nuevo.');
          }
        },
      });
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}