import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab3ConsultaAnonimoPage } from './tab3-consulta-anonimo.page';

describe('Tab3ConsultaAnonimoPage', () => {
  let component: Tab3ConsultaAnonimoPage;
  let fixture: ComponentFixture<Tab3ConsultaAnonimoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab3ConsultaAnonimoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
