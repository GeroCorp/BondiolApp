import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabsMozoPage } from './tabs-mozo.page';

describe('TabsMozoPage', () => {
  let component: TabsMozoPage;
  let fixture: ComponentFixture<TabsMozoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsMozoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
