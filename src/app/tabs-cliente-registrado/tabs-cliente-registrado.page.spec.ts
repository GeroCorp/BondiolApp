import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabsClienteRegistradoPage } from './tabs-cliente-registrado.page';

describe('TabsClienteRegistradoPage', () => {
  let component: TabsClienteRegistradoPage;
  let fixture: ComponentFixture<TabsClienteRegistradoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsClienteRegistradoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
