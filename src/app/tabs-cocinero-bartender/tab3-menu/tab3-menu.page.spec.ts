import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab3MenuPage } from './tab3-menu.page';

describe('Tab3MenuPage', () => {
  let component: Tab3MenuPage;
  let fixture: ComponentFixture<Tab3MenuPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab3MenuPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
