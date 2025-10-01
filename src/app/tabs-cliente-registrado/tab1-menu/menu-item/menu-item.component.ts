import { Component, Input, OnInit, Output, SimpleChanges, EventEmitter } from '@angular/core';
import { IonCard, IonCardSubtitle, IonCardTitle, IonCardHeader, IonImg, IonLabel, IonCardContent, IonButton, IonIcon, IonButtons, IonBackButton } from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-menu-item',
  templateUrl: './menu-item.component.html',
  styleUrls: ['./menu-item.component.scss'],
  imports: [IonIcon, IonButton, IonCardContent, IonLabel, IonImg, IonCardHeader, IonCardTitle, IonCard, CommonModule],
})
export class MenuItemComponent  implements OnInit {
  @Input() item: any = {};
  @Output() closeItem = new EventEmitter<void>();
  @Output() addItem = new EventEmitter<any>()
  
  public currentImageIndex: number = 0;
  public quantity: number = 1;
  constructor() { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
  console.log('Cambios en item:', changes['item']);
  this.item = changes['item'].currentValue;
  this.handleImages();
}

  handleImages(){
    const imgArray = this.item.imagenes.split(',');
    this.item.imagenes = imgArray;
    console.log(imgArray);
  }

  public nextImage() {
    this.currentImageIndex++;
  }

  public prevImage() {
    this.currentImageIndex--;
  }

  onClose(){
    this.item = null;
    this.currentImageIndex = 0;
    this.quantity = 1; // Reset quantity when closing
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
