import {
  AfterViewInit, Component, ElementRef, OnDestroy, ViewChild,
  ViewEncapsulation, effect, inject, input, output,
} from '@angular/core';
import * as L from 'leaflet';
import { GeocodeService, MapPoint } from '../../services/geocode';

@Component({
  selector: 'app-map-picker',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display:block;height:100%' },
  template: `<div #map class="map-picker"></div>`,
  styles: [`
    .map-picker {
      height: 100%;
      min-height: 420px;
      width: 100%;
      border-radius: 20px;
      overflow: hidden;
    }
    .map-pin {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #2f6bff;
      border: 3px solid #ffffff;
      box-shadow: 0 0 0 6px rgba(47, 107, 255, 0.35);
    }
    .map-pin.dest {
      background: #ff7a1a;
      box-shadow: 0 0 0 6px rgba(255, 122, 26, 0.35);
    }
    .map-me {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #22c55e;
      border: 3px solid #ffffff;
      animation: me-pulse 2s infinite;
    }
    .map-car {
      font-size: 28px;
      line-height: 28px;
      text-align: center;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
    }
    @keyframes me-pulse {
      0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); }
      70% { box-shadow: 0 0 0 16px rgba(34, 197, 94, 0); }
      100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }
  `],
})
export class MapPickerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('map', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  private geocode = inject(GeocodeService);

  origin = input<MapPoint | null>(null);
  destination = input<MapPoint | null>(null);
  driver = input<MapPoint | null>(null);
  // false = el mapa no se centra en tu ubicación (pantalla de seguimiento)
  centerOnMe = input(true);
  locationFound = output<MapPoint>();
  locationError = output<string>();

  private map?: L.Map;
  private originMarker?: L.Marker;
  private destMarker?: L.Marker;
  private driverMarker?: L.Marker;
  private line?: L.Polyline;
  private meMarker?: L.Marker;
  private watchId?: number;
  private lastPos?: { lat: number; lng: number };
  private firstFix = true;

  private originIcon = L.divIcon({
    className: '',
    html: '<div class="map-pin"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  private destIcon = L.divIcon({
    className: '',
    html: '<div class="map-pin dest"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  private meIcon = L.divIcon({
    className: '',
    html: '<div class="map-me"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  private carIcon = L.divIcon({
    className: '',
    html: '<div class="map-car">🚗</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  constructor() {
    effect(() => {
      this.draw(this.origin(), this.destination());
    });
    effect(() => {
      this.drawDriver(this.driver());
    });
  }

  ngAfterViewInit() {
    // Centro de Neiva por defecto, hasta detectar tu ubicación
    this.map = L.map(this.mapEl.nativeElement).setView([2.9273, -75.2819], 14);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);

    setTimeout(() => {
      this.map?.invalidateSize();
      this.draw(this.origin(), this.destination());
      this.drawDriver(this.driver());
    }, 300);

    this.startTracking();
  }

  ngOnDestroy() {
    if (this.watchId !== undefined) navigator.geolocation.clearWatch(this.watchId);
    this.map?.remove();
  }

  // ---------- Ubicación en tiempo real ----------
  private startTracking() {
    if (!('geolocation' in navigator)) {
      this.locationError.emit('Tu navegador no permite obtener la ubicación.');
      return;
    }
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.onPosition(pos.coords.latitude, pos.coords.longitude),
      (err) =>
        this.locationError.emit(
          err.code === err.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado. Actívalo en el candado de la barra de direcciones.'
            : 'No se pudo obtener tu ubicación.'
        ),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }

  private async onPosition(lat: number, lng: number) {
    this.lastPos = { lat, lng };
    if (!this.map) return;

    if (this.meMarker) {
      this.meMarker.setLatLng([lat, lng]);
    } else {
      this.meMarker = L.marker([lat, lng], {
        icon: this.meIcon,
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(this.map);
    }

    // Solo la primera vez: centra el mapa y avisa para fijar el origen
    if (this.firstFix) {
      this.firstFix = false;
      if (this.centerOnMe()) this.map.setView([lat, lng], 16);
      const name = await this.geocode.reverse(lat, lng);
      this.locationFound.emit({ name, lat, lng });
    }
  }

  // ---------- Dibujo de los puntos ----------
  private draw(o: MapPoint | null, d: MapPoint | null) {
    if (!this.map) return;

    this.originMarker?.remove();
    this.destMarker?.remove();
    this.line?.remove();
    this.originMarker = this.destMarker = this.line = undefined;

    if (o) {
      this.originMarker = L.marker([o.lat, o.lng], { icon: this.originIcon }).addTo(this.map);
    }
    if (d) {
      this.destMarker = L.marker([d.lat, d.lng], { icon: this.destIcon }).addTo(this.map);
    }

    if (o && d) {
      this.line = L.polyline(
        [[o.lat, o.lng], [d.lat, d.lng]],
        { color: '#60a5fa', weight: 4, dashArray: '8 8' }
      ).addTo(this.map);
      this.map.fitBounds(
        L.latLngBounds([[o.lat, o.lng], [d.lat, d.lng]]),
        { padding: [50, 50] }
      );
    } else if (o) {
      this.map.setView([o.lat, o.lng], 16);
    } else if (d) {
      this.map.setView([d.lat, d.lng], 16);
    }
  }

  // Dibuja o mueve el carro del conductor
  private drawDriver(p: MapPoint | null) {
    if (!this.map) return;
    if (!p) {
      this.driverMarker?.remove();
      this.driverMarker = undefined;
      return;
    }
    if (this.driverMarker) {
      this.driverMarker.setLatLng([p.lat, p.lng]);
    } else {
      this.driverMarker = L.marker([p.lat, p.lng], {
        icon: this.carIcon,
        zIndexOffset: 900,
      }).addTo(this.map);
    }
  }
}