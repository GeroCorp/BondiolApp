import { Component } from '@angular/core';
import { PerfilService } from '../services/perfilService';

@Component({
  selector: 'app-tabs-maitre',
  standalone: false,
  templateUrl: './tabs-maitre.page.html',
  styleUrls: ['./tabs-maitre.page.scss'],
})
export class TabsMaitrePage {

  constructor(private perfilService: PerfilService) { }


}
