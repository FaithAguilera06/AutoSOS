import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ClientRegistrationPage } from './client-registration.page';

describe('ClientRegistrationPage', () => {
  let component: ClientRegistrationPage;
  let fixture: ComponentFixture<ClientRegistrationPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClientRegistrationPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ClientRegistrationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}); 