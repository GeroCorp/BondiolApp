import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabsClientesPage } from './tabs-clientes.page';

describe('TabsClientesPage', () => {
  let component: TabsClientesPage;
  let fixture: ComponentFixture<TabsClientesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsClientesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
