import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab2PedidosConfirmadosPage } from './tab2-pedidos-confirmados.page';

describe('Tab2PedidosConfirmadosPage', () => {
  let component: Tab2PedidosConfirmadosPage;
  let fixture: ComponentFixture<Tab2PedidosConfirmadosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab2PedidosConfirmadosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
