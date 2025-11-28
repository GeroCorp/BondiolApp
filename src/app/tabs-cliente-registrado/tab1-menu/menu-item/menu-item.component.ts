import { Component, Input, OnInit, OnChanges, Output, SimpleChanges, EventEmitter, OnDestroy } from '@angular/core';
import { IonCard, IonCardSubtitle, IonCardTitle, IonCardHeader, IonImg, IonLabel, IonCardContent, IonButton, IonIcon, IonButtons, IonBackButton } from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';
import { Motion, MotionEventResult } from '@capacitor/motion';

@Component({
  selector: 'app-menu-item',
  templateUrl: './menu-item.component.html',
  styleUrls: ['./menu-item.component.scss'],
  imports: [IonIcon, IonButton, IonCardContent, IonLabel, IonImg, IonCardHeader, IonCardTitle, IonCard, CommonModule],
})
export class MenuItemComponent implements OnInit, OnChanges, OnDestroy {
  @Input() item: any = {};
  @Input() itemsArray: any[] = [];
  @Output() closeItem = new EventEmitter<void>();
  @Output() addItem = new EventEmitter<any>()
  
  public currentImageIndex: number = 0;
  public quantity: number = 1;
  public currentItemIndex: number = 0;
  
  // Variables para detectar movimiento
  private lastAccelX: number = 0;
  private lastAccelY: number = 0;
  private accelXCount: number = 0;
  private accelYCount: number = 0;
  private motionSubscription: any = null;

  constructor() { }

  ngOnInit() {
    if (this.item && Object.keys(this.item).length > 0) {
      this.handleImages();
      this.resetState();
    }
    this.initializeMotionDetection();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['item'] && changes['item'].currentValue) {
      this.item = changes['item'].currentValue;
      this.handleImages();
      this.resetState();
    }
  }

  ngOnDestroy() {
    // Detener la suscripción al destruir el componente
    if (this.motionSubscription) {
      this.motionSubscription.remove();
    }
  }

  private async initializeMotionDetection() {
    try {
      console.log('Inicializando Motion Detection...');
      
      // Agregamos el listener directamente
      this.motionSubscription = await Motion.addListener('accel', (event: MotionEventResult) => {
        console.log('🎯 EVENT COMPLETO:', JSON.stringify(event));
        console.log('🎯 EVENT KEYS:', Object.keys(event));
        console.log('🎯 EVENT acceleration:', event.acceleration);
        this.handleMotion(event);
      });
      console.log('✅ Motion Detection activo - Listener registrado');
    } catch (error: any) {
      console.warn('❌ Motion API error:', error);
      console.error('Error completo:', JSON.stringify(error));
    }
  }

  private handleMotion(event: MotionEventResult) {
    console.log('🔴 handleMotion LLAMADO');
    const accelX = event.acceleration?.x || 0;
    const accelY = event.acceleration?.y || 0;

    console.log('Motion Event Raw:', {
      accelX,
      accelY,
      fullEvent: event,
      timestamp: new Date().toLocaleTimeString()
    });

    // Detectar movimiento izquierda/derecha (eje X)
    if (accelX > 5) { // Movimiento hacia la derecha
      console.log('Aceleración X DERECHA detectada:', accelX, 'lastAccelX:', this.lastAccelX);
      if (this.lastAccelX <= 0) {
        this.accelXCount++;
        this.lastAccelX = accelX;
        console.log('✓ Movimiento DERECHA confirmado. accelXCount:', this.accelXCount);
        
        // Si se detectan 3+ cambios izq-der, volver al inicio
        if (this.accelXCount >= 3) {
          console.log('🔄 COMBO DETECTADO - Volviendo al inicio');
          this.currentItemIndex = 0;
          this.currentImageIndex = 0;
          this.updateItem();
          this.accelXCount = 0;
        } else {
          console.log('⬅️ Ejecutando prevImage()');
          this.prevImage(); // Foto anterior
        }
      }
    } else if (accelX < -5) { // Movimiento hacia la izquierda
      console.log('Aceleración X IZQUIERDA detectada:', accelX, 'lastAccelX:', this.lastAccelX);
      if (this.lastAccelX >= 0) {
        this.accelXCount++;
        this.lastAccelX = accelX;
        console.log('✓ Movimiento IZQUIERDA confirmado. accelXCount:', this.accelXCount);
        
        // Si se detectan 3+ cambios izq-der, volver al inicio
        if (this.accelXCount >= 3) {
          console.log('🔄 COMBO DETECTADO - Volviendo al inicio');
          this.currentItemIndex = 0;
          this.currentImageIndex = 0;
          this.updateItem();
          this.accelXCount = 0;
        } else {
          console.log('➡️ Ejecutando nextImage()');
          this.nextImage(); // Foto siguiente
        }
      }
    } else {
      console.log('Aceleración X neutral/baja:', accelX);
      this.lastAccelX = 0;
      this.accelXCount = 0;
    }

    // Detectar movimiento adelante/atrás (eje Y)
    if (accelY > 8) { // Movimiento hacia adelante
      console.log('Aceleración Y ADELANTE detectada:', accelY, 'lastAccelY:', this.lastAccelY);
      if (this.lastAccelY <= 0) {
        console.log('⬇️ Ejecutando nextProduct()');
        this.nextProduct();
        this.lastAccelY = accelY;
      }
    } else if (accelY < -8) { // Movimiento hacia atrás
      console.log('Aceleración Y ATRÁS detectada:', accelY, 'lastAccelY:', this.lastAccelY);
      if (this.lastAccelY >= 0) {
        console.log('⬆️ Ejecutando prevProduct()');
        this.prevProduct();
        this.lastAccelY = accelY;
      }
    } else {
      console.log('Aceleración Y neutral/baja:', accelY);
      this.lastAccelY = 0;
    }
  }

  private updateItem() {
    if (this.itemsArray && this.itemsArray.length > this.currentItemIndex) {
      this.item = this.itemsArray[this.currentItemIndex];
      this.handleImages();
      this.resetState();
    }
  }

  private resetState() {
    this.currentImageIndex = 0;
    this.quantity = 1;
  }

  handleImages(){
    if (!this.item || !this.item.imagenes) {
      this.item.imagenes = ['assets/placeholder.png'];
      return;
    }
    
    // Si es un string, hacer split; si es array, usar directamente
    const imgArray = typeof this.item.imagenes === 'string' 
      ? this.item.imagenes.split(',')
      : Array.isArray(this.item.imagenes) 
        ? this.item.imagenes 
        : ['assets/placeholder.png'];
    
    this.item.imagenes = imgArray.map((img: string) => img.trim()).filter((img: string) => img.length > 0);
    console.log('Imágenes procesadas:', this.item.imagenes);
  }

  public nextImage() {
    if (this.item?.imagenes && this.currentImageIndex < this.item.imagenes.length - 1) {
      this.currentImageIndex++;
      console.log('Next Image:', this.currentImageIndex);
    }
  }

  public prevImage() {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
      console.log('Previous Image:', this.currentImageIndex);
    }
  }

  public nextProduct() {
    if (this.itemsArray && this.currentItemIndex < this.itemsArray.length - 1) {
      this.currentItemIndex++;
      this.updateItem();
      console.log('Next Product:', this.currentItemIndex, this.item?.nombre);
    }
  }

  public prevProduct() {
    if (this.currentItemIndex > 0) {
      this.currentItemIndex--;
      this.updateItem();
      console.log('Previous Product:', this.currentItemIndex, this.item?.nombre);
    }
  }

  onClose(){
    this.item = null;
    this.currentImageIndex = 0;
    this.quantity = 1;
    this.currentItemIndex = 0;
    this.closeItem.emit();
  }

  onAddItem(){
    // Crear un objeto con el item y la cantidad
    const itemWithQuantity = {
      ...this.item,
      quantity: this.quantity,
      subtotal: this.item.precio * this.quantity
    };
    this.addItem.emit(itemWithQuantity);
  }

  increaseQuantity() {
    this.quantity++;
  }

  decreaseQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

}
