import { Component, ViewChild, OnInit, AfterViewInit, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonInput } from '@ionic/angular';
import { Geolocation, PermissionStatus, Position } from '@capacitor/geolocation';

import { GoogleMap, MapDirectionsService, MapGeocoder } from '@angular/google-maps';
import { Observable, map } from 'rxjs'; // Necesitamos Observable y map

import { CustomLoaderService } from 'src/app/services/custom-loader.service';
import { Delivery } from 'src/app/services/delivery';

@Component({
  selector: 'app-maps',
  templateUrl: './maps.page.html',
  styleUrls: ['./maps.page.scss'],
  standalone: false
})
export class MapsPage implements OnInit, AfterViewInit {

  @ViewChild(GoogleMap) map!: GoogleMap;

  id_pedido: number = 0;
  
  // Configuracion del mapa
  mapZoom = 15; 
  mapCenter: google.maps.LatLngLiteral = { lat: -34.662034305222576, lng: -58.364501360830744 }; // Centro inicial (Buenos Aires)
  mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    
  };
  
  // Variables de routes
  direccionOrigen: string = "Av. Bartolomé Mitre 750 Avellaneda"
  directionsResults$!: Observable<google.maps.DirectionsResult | undefined>;
  // La dirección final que viene de la BD (ejemplo)
  direccionDestino: string = "";
  direccionDestinoCoords: google.maps.LatLngLiteral = { lat: 0, lng: 0 };
  direccionRendererOptions: google.maps.DirectionsRendererOptions = {
    suppressMarkers: true,
    polylineOptions: {
      strokeColor: '#b30808ff',
      strokeWeight: 6
    }
  }

  // Configuracion para seguimiento del delivery
  // 1. Variable para guardar la posición del usuario (el marcador en movimiento)
  currentPosition: google.maps.LatLngLiteral = { lat: 0, lng: 0 }; 
  userMarkerOptions: google.maps.MarkerOptions = {
    icon: {
        url: 'assets/bicycle.svg', // <-- RUTA A TU IMAGEN SVG
        scaledSize: new google.maps.Size(30, 30), // Tamaño
    },
    title: 'Mi ubicación actual',
    zIndex: 9999 // Asegura que esté por encima de la ruta
};
  
  // 2. ID para detener el observador cuando salgas de la página
  watchId: any = null;



  constructor(
    private directionsService: MapDirectionsService, 
    private ngZone: NgZone,
    private geocoder: MapGeocoder,
    private customLoader: CustomLoaderService,
    private delivery: Delivery,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  async ngOnInit() {
    this.customLoader.show('Cargando mapa...');
    this.getDireccionPedido().then(() => {
      this.calcularRuta(
        this.direccionOrigen, // O usa this.markerPosition si lo tienes
        this.direccionDestino, 
        google.maps.TravelMode.BICYCLING // O .DRIVING si prefieres moto
      );
      this.direccionToCoords(this.direccionDestino).then(coords => {
        this.direccionDestinoCoords = coords;
      }).catch(error => {
        console.error(error);
      });
    }).finally(() => {
      this.getCurrentPosition()
      
      this.startTracking();
      this.customLoader.hide();
    });
  }

  ngAfterViewInit() {
    // Aquí podrías agregar lógica adicional si es necesario
  }

  ngOnDestroy() {
    if (this.watchId) {
      Geolocation.clearWatch({ id: this.watchId });
    }
  }

  async startTracking() {
    
    // Si ya hay un seguimiento activo, lo detenemos primero
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
    }
    
    this.watchId = await Geolocation.watchPosition({
      enableHighAccuracy: true, // Máxima precisión
      timeout: 5000,
      maximumAge: 0 // No usar caché
    }, (position: Position | null, err: any) => {
      
      if (err) {
        console.error('Error al ver la posición:', err);
        return;
      }

      if (position) {
        const newCoords = { 
          lat: position.coords.latitude, 
          lng: position.coords.longitude 
        };
        
        // 3. Actualizamos el marcador en el mapa
        this.currentPosition = newCoords;
      }
    });
  }
  

  calcularRuta(origin: string | google.maps.LatLngLiteral, destination: string | google.maps.LatLngLiteral, travelMode: google.maps.TravelMode) {

    // 4. CONFIGURACIÓN DE LA PETICIÓN
    const request: google.maps.DirectionsRequest = {
      origin: origin,
      destination: destination,
      travelMode: travelMode, // 👈 Usa el modo de viaje (BICYCLING o DRIVING)
      provideRouteAlternatives: false,
      unitSystem: google.maps.UnitSystem.METRIC, // Metros/Kilómetros
      optimizeWaypoints: true
    };  
    console.log("📍 Origen recibido:", origin); // <-- Revisar si es {lat: 0, lng: 0} o 'MY_LOCATION'
    console.log("🏠 Destino recibido:", destination); // <-- Revisar si es una dirección válida
    
    // 5. HACER LA PETICIÓN Y ALMACENAR EL RESULTADO
    this.directionsResults$ = this.directionsService.route(request).pipe(
      map(response => {
        if (response.result === undefined) {
          console.error("No se pudo encontrar una ruta.");
          return undefined;
        }
        return response.result;
      })
    );
  }

  getCurrentPosition(){
    Geolocation.getCurrentPosition({ enableHighAccuracy: true }).then((position) => {
      this.currentPosition = {lat: position.coords.latitude, lng: position.coords.longitude};

      this.calcularRuta(
        this.currentPosition, 
        this.direccionDestino, 
        google.maps.TravelMode.BICYCLING // O .DRIVING si prefieres moto
      )

      this.panToCurrentLocation(this.currentPosition);
    }).catch((error) => {
      console.error('Error al obtener ubicación:', error);
    })
  }

  ////////////////
  // Utilities //
  panToCurrentLocation(coords: google.maps.LatLngLiteral) {
    if (this.map && this.map.googleMap) {
      this.map.googleMap.panTo(coords);
    }
  }

  direccionToCoords(direccion: string): Promise<google.maps.LatLngLiteral> {
    return new Promise((resolve, reject) => {
      this.geocoder.geocode({ address: direccion }).subscribe(({ results }) => {
        if (results && results.length > 0) {
          const location = results[0].geometry.location;
          resolve({ lat: location.lat(), lng: location.lng() });
        }
        else {
          reject('No se encontraron resultados para la dirección proporcionada.');
        }
      }, (error) => {
        reject('Error en geocoding: ' + error);
      }
      );
    });
  }

  async getDireccionPedido(){
    await this.getNumeroPedido();
    this.direccionDestino = await this.delivery.getDireccionDePedido(this.id_pedido);
  }
  
  private async getNumeroPedido(){
    this.route.paramMap.subscribe(params =>{
      const id_pedido = params.get('id_pedido');
      if (id_pedido && this.id_pedido !== parseInt(id_pedido, 10)) {
        this.id_pedido = parseInt(id_pedido, 10);
      }
    })
  }

  volver(){
    if (this.watchId) {
      Geolocation.clearWatch({ id: this.watchId });
    }
    this.router.navigate(['/tabs-delivery/tab1-pedidos']);
  }
}
