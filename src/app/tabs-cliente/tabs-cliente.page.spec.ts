import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabsClientePage } from './tabs-cliente.page';

describe('TabsClientePage', () => {
  let component: TabsClientePage;
  let fixture: ComponentFixture<TabsClientePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsClientePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
