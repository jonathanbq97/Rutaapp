import { Injectable } from '@angular/core';

export interface MapPoint {
  name: string;
  lat: number;
  lng: number;
}

@Injectable({ providedIn: 'root' })
export class GeocodeService {
  private base = 'https://nominatim.openstreetmap.org';

  // Busca direcciones o lugares dentro de Neiva
  async search(query: string): Promise<MapPoint[]> {
    try {
      const url =
        `${this.base}/search?format=jsonv2&addressdetails=1&limit=5` +
        `&countrycodes=co&accept-language=es` +
        `&viewbox=-75.40,3.05,-75.15,2.85&bounded=1` +
        `&q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data: any[] = await res.json();
      return data.map((item) => ({
        name: this.label(item),
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
    } catch {
      return [];
    }
  }

  // Convierte coordenadas en una dirección (para la ubicación del usuario)
  async reverse(lat: number, lng: number): Promise<string> {
    const fallback = `Punto (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    try {
      const url =
        `${this.base}/reverse?format=jsonv2&zoom=18&addressdetails=1` +
        `&accept-language=es&lat=${lat}&lon=${lng}`;
      const res = await fetch(url);
      if (!res.ok) return fallback;
      const item = await res.json();
      return this.label(item) || fallback;
    } catch {
      return fallback;
    }
  }

  // Arma un nombre corto: "Calle # número, barrio"
  private label(item: any): string {
    const a = item.address || {};
    const road = a.road || a.pedestrian || a.footway || a.path || '';
    const number = a.house_number ? ` # ${a.house_number}` : '';
    const barrio = a.neighbourhood || a.quarter || a.suburb || '';
    const main = item.name && item.name !== road ? item.name : `${road}${number}`;
    const parts = [main, barrio].filter((p) => !!p);
    if (parts.length) return parts.join(', ');
    return item.display_name
      ? item.display_name.split(',').slice(0, 3).join(',').trim()
      : '';
  }
}