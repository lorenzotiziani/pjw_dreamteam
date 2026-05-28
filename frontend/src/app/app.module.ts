import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

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

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    HomeComponent,
    IfAuthenticatedDirective
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    BaseChartDirective,
    RouterModule
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
