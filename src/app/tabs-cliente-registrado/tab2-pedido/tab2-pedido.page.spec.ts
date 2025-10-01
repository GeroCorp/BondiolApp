import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab2PedidoPage } from './tab2-pedido.page';

describe('Tab2PedidoPage', () => {
  let component: Tab2PedidoPage;
  let fixture: ComponentFixture<Tab2PedidoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab2PedidoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
