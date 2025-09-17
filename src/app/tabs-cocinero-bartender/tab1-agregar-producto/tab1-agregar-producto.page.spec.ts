import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab1AgregarProductoPage } from './tab1-agregar-producto.page';

describe('Tab1AgregarProductoPage', () => {
  let component: Tab1AgregarProductoPage;
  let fixture: ComponentFixture<Tab1AgregarProductoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab1AgregarProductoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
