import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab2PedidoAnonimoPage } from './tab2-pedido-anonimo.page';

describe('Tab2PedidoAnonimoPage', () => {
  let component: Tab2PedidoAnonimoPage;
  let fixture: ComponentFixture<Tab2PedidoAnonimoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab2PedidoAnonimoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
