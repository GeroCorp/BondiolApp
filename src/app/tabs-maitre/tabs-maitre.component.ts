import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';


@Component({
  selector: 'app-tabs-maitre',
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './tabs-maitre.component.html',
  styleUrls: ['./tabs-maitre.component.scss']
})
export class TabsMaitreComponent implements OnInit {
  selectedTab = 'tab1-espera'; // Tab por defecto

  constructor(private router: Router) {}

  ngOnInit() {
    // cuando entra por primera vez, aseguramos que cargue la tab1
    this.router.navigate(['/tabs-maitre/tab1-espera']);
  }
  
  onTabChange(event: any) {
    this.selectedTab = event.detail.value;
    this.router.navigate([`/tabs-maitre/${this.selectedTab}`]);
  }
}
