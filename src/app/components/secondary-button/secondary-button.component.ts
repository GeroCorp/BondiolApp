import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonButton, IonIcon } from "@ionic/angular/standalone";

@Component({
  selector: 'app-secondary-button',
  imports: [IonButton, IonIcon],
  templateUrl: './secondary-button.component.html',
  styleUrls: ['./secondary-button.component.scss'],
})
export class SecondaryButtonComponent {
  
  @Input() icon: string = '';
  @Input() clase: string = 'secondary';
  @Input() disabled: boolean = false;
  @Input() type: string = 'button'; // Puede ser 'button' o 'submit'

  // Creamos el "emisor" de eventos
  @Output() btnClick = new EventEmitter<void>();

  onClick() {
    this.btnClick.emit(); // Lanza el aviso al padre
  }

}
