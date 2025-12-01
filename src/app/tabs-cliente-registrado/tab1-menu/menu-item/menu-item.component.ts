import { Component, Input, OnInit, OnChanges, Output, SimpleChanges, EventEmitter, OnDestroy } from '@angular/core';
import { IonCard, IonCardTitle, IonCardHeader, IonImg, IonLabel, IonCardContent, IonButton, IonIcon } from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';

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
  @Output() addItem = new EventEmitter<any>();
  
  public currentImageIndex: number = 0;
  public quantity: number = 1;
  public currentItemIndex: number = 0;
  
  // Variables para detectar movimiento
  private ZDirection: 'left' | 'right' | null = null;
  private XDirection: 'forward' | 'backward' | null = null;
  private ZCount: number = 0;
  private XCount: number = 0;
  private lastActionTime: number = 0;
  private actionCooldown: number = 1000; // ✅ Cambié a 1500ms (1.5 segundos)
  private lastProductChangeTime: number = 0;
  
  constructor() { }

  ngOnInit() {
    if (this.item && Object.keys(this.item).length > 0) {
      this.searchForItemIndex();
      this.itemsArray.forEach(i => {
        console.log(i);
      }); // para ver los items en consola
      this.handleImages();
      this.resetState();
    }
    this.initialiZeDeviceOrientation();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['item'] && changes['item'].currentValue) {
      this.item = changes['item'].currentValue;
      this.handleImages();
      this.resetState();
    }
  }

  ngOnDestroy() {
    window.removeEventListener('deviceorientation', this.orientationHandler);
  }

  private searchForItemIndex() {
    if (this.itemsArray && this.item) {
      const index = this.itemsArray.findIndex(i => i.id === this.item.id);
      if (index !== -1) {
        this.currentItemIndex = index;
      }
    }
  }

  private orientationHandler = (event: DeviceOrientationEvent) => {
    this.handleDeviceOrientation(event);
  };



  private initialiZeDeviceOrientation() {
    // Solo inicializar en apps nativas


    console.log('📱 InicialiZando DeviceOrientation...');
    window.addEventListener('deviceorientation', this.orientationHandler);
    console.log('✅ DeviceOrientation listener registrado');
  }

  private handleDeviceOrientation(event: DeviceOrientationEvent) {
    const Y = event.alpha || 0;
    const X = event.beta || 0;
    const Z = event.gamma || 0;

    const now = Date.now();
    const canAct = (now - this.lastActionTime) > this.actionCooldown;

    console.log(`Rotación Y: ${Y.toFixed(1)} X: ${X.toFixed(1)} Z: ${Z.toFixed(1)} | canAct: ${canAct}`);
    // Si está bloqueado, no hacer nada


    // ===== DETECCIÓN IZQUIERDA/DERECHA (Z) =====
    if (Z > 55) {
      if (this.ZDirection !== 'right' && canAct) {
        console.log('➡️ DERECHA detectada - Click en botón prevImage');
        this.simulateButtonClick('btn-prev-image');
        this.ZDirection = 'right';
        this.lastActionTime = now;
        this.ZCount = 0;
      }
    } else if (Z < -55) {
      if (this.ZDirection !== 'left' && canAct) {
        console.log('⬅️ IZQUIERDA detectada - Click en botón nextImage');
        this.simulateButtonClick('btn-next-image');
        this.ZDirection = 'left';
        this.lastActionTime = now;
        this.ZCount++;
        
        if (this.ZCount >= 5) {
          console.log('🔄 COMBO IZQUIERDA DETECTADO - Volviendo al inicio');
          this.currentItemIndex = 0;
          this.currentImageIndex = 0;
          this.ZCount = 0;
        }
      }
    } else if ( Z > -5 && Z < 5) {
      this.ZDirection = null;
      console.log('↔️ Zona neutral Z - reset');
    }

    // ===== DETECCIÓN ADELANTE/ATRÁS (Y - ALPHA) =====

    const canChangeProduct = (now - this.lastProductChangeTime) > this.actionCooldown;


    if (X < 30) {
      if (this.XDirection !== 'forward' && canAct && canChangeProduct) {
        console.log('⬇️ ADELANTE detectada - Click en botón nextProduct');
        this.simulateButtonClick('btn-next-product');
        this.XDirection = 'forward';
        this.lastActionTime = now;
        this.lastProductChangeTime = now; // 🔒 Bloquea cambios de producto

        this.XCount = 0;
      }
    } else if (X > 100) {
      if (this.XDirection !== 'backward' && canAct && canChangeProduct) {
        console.log('⬆️ ATRÁS detectada - Click en botón prevProduct');
        this.simulateButtonClick('btn-prev-product');
        this.XDirection = 'backward';
        this.lastActionTime = now;
        this.lastProductChangeTime = now; // 🔒 Bloquea cambios de producto

        this.XCount++;
        
        if (this.XCount >= 5) {
          console.log('🔄 COMBO ATRÁS DETECTADO - Volviendo al inicio');
          this.currentItemIndex = 0;
          this.currentImageIndex = 0;
          this.XCount = 0;
        }
      }
    } else if ((Y > 170 && Y < 190) || (Y > 350 || Y < 10)) {
      console.log('⬆️⬇️ Zona neutral Y - reset');
    }
  }

  private simulateButtonClick(buttonId: string) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.click();
      console.log(`✅ Click simulado en ${buttonId}`);
    } else {
      console.warn(`⚠️ Botón ${buttonId} no encontrado`);
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
      this.item = this.itemsArray[this.currentItemIndex + 1];
      this.currentItemIndex++;
      this.XDirection = null;

      this.currentImageIndex = 0;
      this.handleImages();
      console.log('Next Product:', this.currentItemIndex, this.item?.nombre);
    }
  }

  public prevProduct() {
    if (this.currentItemIndex > 0) {
      this.currentItemIndex--;
      this.item = this.itemsArray[this.currentItemIndex];

      this.XDirection = null;

      this.currentImageIndex = 0;
      this.handleImages();
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
