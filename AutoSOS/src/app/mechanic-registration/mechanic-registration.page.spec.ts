import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { MechanicRegistrationPage } from './mechanic-registration.page';

describe('MechanicRegistrationPage', () => {
  let component: MechanicRegistrationPage;
  let fixture: ComponentFixture<MechanicRegistrationPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MechanicRegistrationPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(MechanicRegistrationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}); 