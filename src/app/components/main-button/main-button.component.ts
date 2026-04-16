import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonButton, IonIcon} from "@ionic/angular/standalone";

@Component({
  selector: 'app-main-button',
  templateUrl: './main-button.component.html',
  imports: [IonButton, IonIcon],
  styleUrls: ['./main-button.component.scss'],
})
export class MainButtonComponent {
  @Input() icon: string = '';
  @Input() disabled: boolean = false;
  @Input() type: string = 'button'; // Puede ser 'button' o 'submit'

  // Creamos el "emisor" de eventos
  @Output() btnClick = new EventEmitter<void>();

  onClick() {
    this.btnClick.emit(); // Lanza el aviso al padre
  }
}