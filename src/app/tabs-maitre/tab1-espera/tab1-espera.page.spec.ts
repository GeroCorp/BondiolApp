import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab1Espera } from './tab1-espera.page';

describe('Tab1EsperaPage', () => {
  let component: Tab1Espera;
  let fixture: ComponentFixture<Tab1Espera>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab1Espera);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
