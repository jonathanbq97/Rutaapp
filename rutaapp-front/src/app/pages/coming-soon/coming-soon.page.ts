import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [IonContent],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <div class="panel">
          <h2>{{ title }}</h2>
          <p class="muted">Esta pantalla se construye en el lote {{ lote }}.</p>
        </div>
      </div>
    </ion-content>
  `,
})
export class ComingSoonPage {
  private route = inject(ActivatedRoute);
  title: string = this.route.snapshot.data['title'] ?? 'Próximamente';
  lote: number = this.route.snapshot.data['lote'] ?? 0;
}
