import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab1PedidosPendientesPage } from './tab1-pedidos-pendientes.page';

describe('Tab1PedidosPendientesPage', () => {
  let component: Tab1PedidosPendientesPage;
  let fixture: ComponentFixture<Tab1PedidosPendientesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab1PedidosPendientesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
