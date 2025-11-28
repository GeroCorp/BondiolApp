import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'statusFormat'
})
export class StatusFormatPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {

    buttonLabel = ''

    switch(value) {
      case 'pendiente':
        buttonLabel = 'Confirmar Pedido';
        break;
      case 'confirmado':
        buttonLabel = 'Esperando Preparación';
        break;
      case 'listo':
        buttonLabel = 'Entregar Pedido';
        break;
      default:
        buttonLabel = 'Acción no disponible';
    }

    return buttonLabel;
  }

}
