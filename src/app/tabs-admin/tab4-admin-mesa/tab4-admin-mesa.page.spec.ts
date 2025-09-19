import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab4AdminMesaPage } from './tab4-admin-mesa.page';

describe('Tab4AdminMesaPage', () => {
  let component: Tab4AdminMesaPage;
  let fixture: ComponentFixture<Tab4AdminMesaPage>;

  beforeEach(() => {
      fixture = TestBed.createComponent(Tab4AdminMesaPage);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
