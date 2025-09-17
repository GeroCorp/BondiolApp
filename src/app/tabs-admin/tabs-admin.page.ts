import { Component, OnInit } from '@angular/core';
import { PerfilService } from '../services/perfilService';

@Component({
  selector: 'app-tabs-admin',
  templateUrl: './tabs-admin.page.html',
  styleUrls: ['./tabs-admin.page.scss'],
  standalone: false
})
export class TabsAdminPage{

  constructor(private perfilService: PerfilService) { }

  

}
