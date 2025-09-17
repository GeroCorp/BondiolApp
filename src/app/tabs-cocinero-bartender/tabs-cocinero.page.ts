import { Component } from '@angular/core';
import { PerfilService } from '../services/perfilService';

@Component({
  selector: 'app-tabs-cocinero',
  standalone: false,
  templateUrl: './tabs-cocinero.page.html',
  styleUrls: ['./tabs-cocinero.page.scss'],
})
export class TabsCocineroPage {

  constructor(private perfilService: PerfilService) { 
  }

}
