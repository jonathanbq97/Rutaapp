import { Component, input, output } from '@angular/core';
import { IonButton } from '@ionic/angular';

@Component({
  selector: 'app-pager',
  standalone: true,
  imports: [IonButton],
  template: `
    <div class="pager">
      <ion-button fill="outline" size="small" [disabled]="page() <= 1" (click)="changed.emit(page() - 1)">
        Anterior
      </ion-button>
      <span>Página {{ page() }} de {{ lastPage() }} · {{ total() }} registros</span>
      <ion-button fill="outline" size="small" [disabled]="page() >= lastPage()" (click)="changed.emit(page() + 1)">
        Siguiente
      </ion-button>
    </div>
  `,
  styles: [`
    .pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; font-size: 14px; flex-wrap: wrap; }
  `],
})
export class PagerComponent {
  page = input(1);
  lastPage = input(1);
  total = input(0);
  changed = output<number>();
}
