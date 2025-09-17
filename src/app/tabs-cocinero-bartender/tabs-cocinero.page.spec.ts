import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabsCocineroPage } from './tabs-cocinero.page';

describe('TabsCocineroPage', () => {
  let component: TabsCocineroPage;
  let fixture: ComponentFixture<TabsCocineroPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsCocineroPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
