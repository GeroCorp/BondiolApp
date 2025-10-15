import { Component, OnInit, signal } from '@angular/core';
import { PerfilService } from 'src/app/services/perfilService';
import { AuthService } from 'src/app/services/supabase';

@Component({
  selector: 'app-tab3-menu',
  templateUrl: './tab3-menu.page.html',
  styleUrls: ['./styles.scss'],
  standalone: false
})
export class Tab3MenuPage implements OnInit {
  perfil: string | null = null;
  readonly platos = signal<any[]>([]);
  readonly bebidas = signal<any[]>([]);
  
  // Estado de carga de imágenes
  imageLoadingStates: { [key: string]: boolean } = {};
  
  // Estado de carga general de datos
  isLoadingData = true;

  constructor(
    private perfilService: PerfilService,
    private authService: AuthService
  ) { 
    this.perfil = this.perfilService.getPerfil();
    console.log('Perfil recibido en Tabs cocinero/bartender:', this.perfil);
  }

  async ngOnInit() {
    this.isLoadingData = true;
    
    // Tiempo mínimo de carga para evitar parpadeo del spinner
    const minLoadingTime = new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const dataPromise = this.perfil === 'cocinero' 
        ? this.cargarPlatos() 
        : this.cargarBebidas();
      
      // Esperar tanto la carga de datos como el tiempo mínimo
      await Promise.all([dataPromise, minLoadingTime]);
      
    } catch (error) {
      console.error('Error inesperado al obtener productos:', error);
      // Aún así esperar el tiempo mínimo en caso de error
      await minLoadingTime;
    } finally {
      this.isLoadingData = false;
    }
  }

  async cargarPlatos() {
    try {
      const data = await this.authService.getPlatos();
      this.platos.set(data ?? []);
      
      // Inicializar el estado de carga para cada plato
      data?.forEach((plato: any) => {
        const imageId = this.getImageId(plato, 'plato');
        this.imageLoadingStates[imageId] = true;
      });
      
      console.log('Platos cargados:', data);
    } catch (error) {
      console.error('Error cargando platos:', error);
    }
  }

  async cargarBebidas() {
    try {
      const data = await this.authService.getBebidas();
      this.bebidas.set(data ?? []);
      
      // Inicializar el estado de carga para cada bebida
      data?.forEach((bebida: any) => {
        const imageId = this.getImageId(bebida, 'bebida');
        this.imageLoadingStates[imageId] = true;
      });
      
      console.log('Bebidas cargadas:', data);
    } catch (error) {
      console.error('Error cargando bebidas:', error);
    }
  }  getFirstImage(imagenes: any): string {
    try {
      if (!imagenes) {
        console.warn('No hay imágenes disponibles');
        return 'assets/images/placeholder.png';
      }
      
      if (typeof imagenes === 'string') {
        // Si es una cadena separada por comas
        if (imagenes.includes(',')) {
          const imagenesArray = imagenes.split(',').map((url: string) => url.trim());
          if (imagenesArray.length > 0) {
            console.log('Primera imagen desde cadena separada por comas:', imagenesArray[0]);
            return imagenesArray[0];
          }
        }
        
        // Si es una cadena simple (una sola URL)
        if (imagenes.startsWith('http')) {
          console.log('Imagen desde URL simple:', imagenes);
          return imagenes;
        }
        
        // Intentar parsear como JSON (formato anterior)
        try {
          const imagenesArray = JSON.parse(imagenes);
          if (Array.isArray(imagenesArray) && imagenesArray.length > 0) {
            console.log('Imagen parseada desde JSON:', imagenesArray[0]);
            return imagenesArray[0];
          }
        } catch (parseError) {
          console.error('Error al parsear JSON de imágenes:', parseError);
        }
      }
      
      if (Array.isArray(imagenes) && imagenes.length > 0) {
        console.log('Imagen desde array:', imagenes[0]);
        return imagenes[0];
      }
      
      console.warn('Formato de imágenes no reconocido:', imagenes);
      return 'assets/placeholder.png';
    } catch (error) {
      console.error('Error obteniendo primera imagen:', error);
      return 'assets/placeholder.png';
    }
  }

  /**
   * Obtener todas las imágenes como array
   */
  getAllImages(imagenes: any): string[] {
    try {
      if (!imagenes) {
        return ['assets/placeholder.png'];
      }
      
      if (typeof imagenes === 'string') {
        // Si es una cadena separada por comas
        if (imagenes.includes(',')) {
          return imagenes.split(',').map((url: string) => url.trim());
        }
        
        // Si es una cadena simple (una sola URL)
        if (imagenes.startsWith('http')) {
          return [imagenes];
        }
        
        // Intentar parsear como JSON (formato anterior)
        try {
          const imagenesArray = JSON.parse(imagenes);
          if (Array.isArray(imagenesArray)) {
            return imagenesArray;
          }
        } catch (parseError) {
          console.error('Error al parsear JSON de imágenes:', parseError);
        }
      }
      
      if (Array.isArray(imagenes)) {
        return imagenes;
      }
      
      return ['assets/placeholder.png'];
    } catch (error) {
      console.error('Error obteniendo todas las imágenes:', error);
      return ['assets/placeholder.png'];
    }
  }

  /**
   * Manejar errores de carga de imágenes
   */
  handleImageError(event: any, imageId?: string) {
    // URL de imagen por defecto cuando falla la carga
    event.target.src = 'assets/images/placeholder.png';
    console.warn('Error cargando imagen, usando placeholder');
    
    // Marcar como cargada (aunque haya fallado)
    if (imageId) {
      this.imageLoadingStates[imageId] = false;
    }
  }

  /**
   * Generar ID único para cada imagen
   */
  getImageId(item: any, type: string): string {
    return `${type}_${item.id || item.nombre}_image`;
  }

  /**
   * Evento cuando la imagen comienza a cargar
   */
  onImageWillLoad(imageId: string) {
    this.imageLoadingStates[imageId] = true;
  }

  /**
   * Evento cuando la imagen termina de cargar
   */
  onImageDidLoad(imageId: string) {
    this.imageLoadingStates[imageId] = false;
  }
}