import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RoleSelectionPage } from './role-selection.page';

describe('RoleSelectionPage', () => {
  let component: RoleSelectionPage;
  let fixture: ComponentFixture<RoleSelectionPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RoleSelectionPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(RoleSelectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}); 