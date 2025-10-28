import { Component, OnInit } from '@angular/core';
import { TipoClienteService } from '../services/tipo-cliente.service';

@Component({
  selector: 'app-tabs-cliente-registrado',
  templateUrl: './tabs-cliente-registrado.page.html',
  styleUrls: ['./tabs-cliente-registrado.page.scss'],
  standalone: false
})
export class TabsClienteRegistradoPage implements OnInit {
  isRegistrado: boolean = true;
  clienteData: any;

  constructor(private tipoClienteService: TipoClienteService) {}

  ngOnInit() {
    this.tipoClienteService.tipoCliente$.subscribe(tipo => {
      this.isRegistrado = tipo === 'registrado';
    });

    this.tipoClienteService.clienteData$.subscribe(data => {
      this.clienteData = data;
    });
  }
}