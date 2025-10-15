import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListaEsperaClientePage } from './lista-espera-cliente.page';

describe('ListaEsperaClientePage', () => {
  let component: ListaEsperaClientePage;
  let fixture: ComponentFixture<ListaEsperaClientePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ListaEsperaClientePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
