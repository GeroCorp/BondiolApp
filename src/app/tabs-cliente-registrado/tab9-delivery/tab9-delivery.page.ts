import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, IonInput } from '@ionic/angular';

import { Geolocation, PermissionStatus } from '@capacitor/geolocation';
import { MapGeocoder } from '@angular/google-maps';

import { ClienteService } from 'src/app/services/cliente.service';
import { CustomLoaderService } from 'src/app/services/custom-loader.service';

@Component({
  selector: 'app-tab9-delivery',
  templateUrl: './tab9-delivery.page.html',
  styleUrls: ['./tab9-delivery.page.scss'],
  standalone: false
})
export class Tab9DeliveryPage implements OnInit, AfterViewInit {

  @ViewChild('inputDireccion') inputCom!: IonInput;

  autocomplete: google.maps.places.Autocomplete | undefined;

   // Configuraciones para mapa 
  coords: google.maps.LatLngLiteral = {lat: 0, lng: 0}; // Las coordenades se setearán dinámicamente
  mapZoom = 15;
  mapStyles: google.maps.MapTypeStyle[] = [
    {
    featureType: 'poi', // Selecciona todos los Puntos de Interés
    elementType: 'labels.icon', // Específicamente, oculta solo los iconos
    stylers: [
      { visibility: 'off' } // Apaga la visibilidad
    ]
  }
  ]
  mapOptions: google.maps.MapOptions = {
    mapTypeId: 'roadmap',
    zoomControl: true,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    maxZoom: 20,
    minZoom: 4,
    fullscreenControl: false,
    streetViewControl: false,
    styles: this.mapStyles,
  };
  // Opciones del marcador
  markerPos: google.maps.LatLngLiteral = {lat: 0, lng: 0};
  markerOpts: google.maps.MarkerOptions = {
    draggable: false
  }

  // Propiedades geocoding
  direccionInput: string = ''; // Campo de busqueda
  direccionFormateada: string | null = null; // Mostrar dirección encontrada


  constructor(
    private toastController: ToastController,
    private geocoder: MapGeocoder,
    private clienteService: ClienteService,
    private customLoader: CustomLoaderService,
    private ngZone: NgZone,
    private router: Router
  ) { }

  ngOnInit() {
    this.requestLocationPermission();
  }

  async requestLocationPermission() {
    try {
      // Solicitar permisos de ubicación
      const permission: PermissionStatus = await Geolocation.requestPermissions();
      
      if (permission.location === 'granted' || permission.location === 'prompt') {
        // Si el permiso fue concedido o está en prompt, obtener la posición
        this.getInitialPosition();
      } else if (permission.location === 'denied') {
        this.showToast('Permiso de ubicación denegado. No podemos acceder a tu ubicación.', 'warning');
      }
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      this.showToast('Error al solicitar permisos de ubicación', 'danger');
    }
  }

  confirmarUbicacion(){
    this.clienteService.setDireccionDelivery(this.direccionInput);

    this.volverHome();
    this.showToast('Dirección de delivery guardada', 'success');
  }

  buscarDireccion(){
    if (!this.direccionInput) {
      this.showToast('Por favor ingrese una dirección válida', 'warning');
      return;
    }

    this.geocoder.geocode({
      address: this.direccionInput
    }).subscribe( ({ results }) => {
      if (results.length > 0) {
        const location = results[0].geometry.location;

        this.coords = { lat: location.lat(), lng: location.lng() };

        this.markerPos = { lat: location.lat(), lng: location.lng() };
        this.mapZoom = 15;
        this.direccionFormateada = results[0].formatted_address;
        this.direccionInput = results[0].formatted_address;

        console.log('Dirección encontrada: ', this.direccionFormateada);
      }else {
        this.showToast('No se encontraron resultados para la dirección ingresada', 'warning');
      }
    }, (error) => {
      console.error('Error en geocoding: ', error);
      this.showToast('Error al buscar la dirección', 'danger');
    })

  }

  getDirecciónDeCoords(coords: google.maps.LatLngLiteral) {
    this.geocoder.geocode({ location: coords }).subscribe(({ results }) => {
      
      this.ngZone.run(() => {
        if (results && results.length > 0) {
          const direccionEncontrada = results[0].formatted_address;

          // Actualizamos la variable del modelo
          this.direccionInput = direccionEncontrada;
          
          // Forzamos la actualización visual del componente ion-input
          // (A veces el Autocomplete interfiere, así que esto asegura que se vea)
          this.inputCom.value = direccionEncontrada;

          console.log('Nueva dirección en el input:', direccionEncontrada);
        } else {
          this.direccionInput = 'Dirección no encontrada';
        }
      });
      
    }, (error) => {
      console.error('Error en geocoding inverso:', error);
    });
  }

  getInitialPosition() {
    Geolocation.getCurrentPosition().then((position) => {
      this.coords = {lat: position.coords.latitude, lng: position.coords.longitude};
      this.markerPos = {lat: this.coords.lat, lng: this.coords.lng};
      // Obtener dirección a partir de las coordenadas
      this.getDirecciónDeCoords(this.coords);
    }).catch((error) => {
      console.error('Error al obtener ubicación:', error);
      this.showToast('No se pudo obtener tu ubicación', 'danger');
    });
  }

  async ngAfterViewInit() {
    // 1. SEGURIDAD: Verificamos que Angular haya encontrado el componente ion-input
    if (!this.inputCom) {
      console.error('Error: No se encontró el elemento ion-input con #inputDireccion');
      return;
    }

    // Ionic envuelve el input HTML real dentro de su componente.
    // Necesitamos "esperar" (await) a sacarlo para dárselo a Google Maps.
    const nativeInput = await this.inputCom.getInputElement();

    // 3. INICIALIZAR EL AUTOCOMPLETE
    this.autocomplete = new google.maps.places.Autocomplete(nativeInput, {
      componentRestrictions: { country: 'ar' }, // Limita la búsqueda a Argentina (opcional)
      types: ['address'], // Busca direcciones exactas
      fields: ['address_components', 'geometry', 'formatted_address'] // Datos que necesitamos
    });

    // 4. ESCUCHAR LA SELECCIÓN DEL USUARIO
    this.autocomplete.addListener('place_changed', () => {
      
      const place = this.autocomplete?.getPlace();

      // 5. ZONA DE ANGULAR (IMPORTANTE)
      // Como este evento viene de Google (fuera de Angular), necesitamos usar ngZone.run
      // para avisarle a la pantalla que actualice los datos (el mapa, el marcador, etc).
      this.ngZone.run(() => {
        
        // Validación: ¿Google encontró coordenadas para esa dirección?
        if (!place || !place.geometry || !place.geometry.location) {
          window.alert("No se encontraron detalles de ubicación para esta dirección.");
          return;
        }

        // --- AQUÍ ACTUALIZAMOS TU MAPA ---
        
        // 1. Obtenemos Latitud y Longitud
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        // 2. Centramos el mapa
        this.coords = { lat, lng };

        // 3. Movemos el marcador
        this.markerPos = { lat, lng };

        // 4. Hacemos zoom para ver mejor la casa
        this.mapZoom = 17;

        // 5. (Opcional) Guardamos el texto de la dirección
        this.direccionInput = place.formatted_address!;
        console.log("Dirección seleccionada:", place.formatted_address);
      });
    });
  }

  handleMapClick (event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.markerPos = event.latLng.toJSON();
      this.getDirecciónDeCoords(event.latLng.toJSON());
    }
  }
  handleMarkerDragEnd(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.getDirecciónDeCoords(event.latLng.toJSON());
    }
  }

  volverHome() {
    this.router.navigate(['/home-cliente']);
  }
  async showToast(message: string, color: 'success' | 'danger' | 'medium' | 'warning' = 'medium') {
      const toast = await this.toastController.create({
        message,
        duration: 3000,
        color,
        position: 'bottom'
      });
      await toast.present();
  }
}
