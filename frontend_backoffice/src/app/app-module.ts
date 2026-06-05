import {
  NgModule,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';

import { LoginComponent } from './pages/login/login';
import { NavbarComponent } from './components/navbar/navbar';
import { NavUserComponent } from './components/nav-user/nav-user';

import { StatCardComponent } from './components/stat-card/stat-card';
import { PuntoVenditaCardComponent } from './components/punto-vendita-card/punto-vendita-card';

import { DashboardComponent } from './pages/dashboard/dashboard';
import { PrenotazioniComponent } from './pages/prenotazioni/prenotazioni';
import { PuntiVenditaComponent } from './pages/punti-vendita/punti-vendita';
import { TipiBiciComponent } from './pages/tipi-bici/tipi-bici';
import { AccessoriComponent } from './pages/accessori/accessori';
import { CoperatureComponent } from './pages/coperture/coperture';
import { AdminComponent }      from './pages/admin/admin';

import { OperatoreCardComponent } from './components/operatore-card/operatore-card';

import { authInterceptor }  from './interceptors/auth-interceptor';
import { logoutInterceptor } from './interceptors/logout-interceptor';
import { IfAuthenticatedDirective } from './directives/if-authenticated';

@NgModule({
  declarations: [
    App,
    LoginComponent,
    NavbarComponent,
    NavUserComponent,
    StatCardComponent,
    PuntoVenditaCardComponent,
    DashboardComponent,
    PrenotazioniComponent,
    PuntiVenditaComponent,
    TipiBiciComponent,
    AccessoriComponent,
    CoperatureComponent,
    AdminComponent,
    OperatoreCardComponent,
    IfAuthenticatedDirective,
  ],
  imports: [BrowserModule, AppRoutingModule, NgbModule, FormsModule, ReactiveFormsModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor, logoutInterceptor])),
  ],
  bootstrap: [App],
})
export class AppModule {}
