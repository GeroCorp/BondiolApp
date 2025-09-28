import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';


@Component({
  selector: 'app-tab3-clientes',
  templateUrl: './tab3-clientes.page.html',
  styleUrls: ['./tab3-clientes.page.scss'],
  standalone: false,
})
export class Tab3ClientesPage implements OnInit {
  

  constructor(
    private router: Router,
  ) {
    
  }

  ngOnInit() {
  }

  registrarCliente() {
    this.router.navigate(['tabs-maitre/tab3-clientes/registrar-cliente'], { replaceUrl: true });
  }

}
