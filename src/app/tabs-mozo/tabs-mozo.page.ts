import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tabs-mozo',
  templateUrl: './tabs-mozo.page.html',
  styleUrls: ['./tabs-mozo.page.scss'],
})
export class TabsMozoPage implements OnInit {
  pedidosPendientes = 0;
  consultasPendientes = 0;

  constructor(private router: Router) { }

  ngOnInit() {
  }

  volverHome() {
    this.router.navigate(['/home']);
  }
}