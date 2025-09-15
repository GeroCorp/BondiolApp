import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab1CargaEmpleadoPage } from './tab1-carga-empleado.page';

describe('Tab1CargaEmpleadoPage', () => {
  let component: Tab1CargaEmpleadoPage;
  let fixture: ComponentFixture<Tab1CargaEmpleadoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab1CargaEmpleadoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
