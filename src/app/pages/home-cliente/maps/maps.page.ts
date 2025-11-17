import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-maps',
  templateUrl: './maps.page.html',
  styleUrls: ['./maps.page.scss'],
  standalone:false
})
export class MapsPage implements OnInit {

  // Configuraciones para mapa 
  coords = {lat: 0, lng: 0}; // Las coordenades se setearán dinámicamente
  mapZoom = 15;
  mapOptions: google.maps.MapOptions = {
    mapTypeId: 'roadmap',
    zoomControl: true,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    maxZoom: 20,
    minZoom: 8,
  };
  // Opciones del marcador
  markerPos: google.maps.LatLngLiteral = {lat: 0, lng: 0};
  markerOpts: google.maps.MarkerOptions = {
    draggable: false
  }


  constructor() { }

  ngOnInit() {}


  handleMapClick (event: google.maps.MapMouseEvent) {
    if (event.latLng) {

      this.markerPos = event.latLng.toJSON();
    }
  }
  handleMarkerDragEnd(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      console.log('Nueva posición del marcador:', event.latLng.toJSON());
      this.markerPos = event.latLng.toJSON();
    }
  }


}
