import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab3ClientesPage } from './tab3-clientes.page';

describe('Tab3ClientesPage', () => {
  let component: Tab3ClientesPage;
  let fixture: ComponentFixture<Tab3ClientesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab3ClientesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
