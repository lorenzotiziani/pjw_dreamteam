import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './utils/auth.interceptor';
import { HomeComponent } from './pages/home/home.component';
import {IfAuthenticatedDirective} from './utils/if-authenthicated.directive'
import {logoutInterceptor} from "./utils/logout.interceptor";
import {BaseChartDirective, provideCharts, withDefaultRegisterables} from 'ng2-charts';
import {RouterModule} from "@angular/router";
import { NavBarComponent } from './components/nav-bar/nav-bar.component';
import { BookingComponent } from './pages/booking/booking.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { BookingFormComponent } from './pages/booking-form/booking-form.component';
import { CardBikeComponent } from './components/card-bike/card-bike.component';
import { NavUserComponent } from './components/nav-user/nav-user.component';
import { BookingListComponent } from './pages/booking-list/booking-list.component';
import { EditBookingComponent } from './components/modals/edit-booking/edit-booking.component';
import { ToastComponent } from './components/toast/toast.component';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { VerifyEmailComponent } from './pages/verify-email/verify-email.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    HomeComponent,
    IfAuthenticatedDirective,
    NavBarComponent,
    BookingComponent,
    BookingFormComponent,
    CardBikeComponent,
    NavUserComponent,
    BookingListComponent,
    EditBookingComponent,
    ToastComponent,
    ConfirmModalComponent,
    VerifyEmailComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    BaseChartDirective,
    RouterModule,
    FontAwesomeModule,
    NgbModule
  ],
  providers: [
    CurrencyPipe,
    provideCharts(withDefaultRegisterables()),
    provideHttpClient(
      withInterceptors([authInterceptor, logoutInterceptor]),
    )
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
