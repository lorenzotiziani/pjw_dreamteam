import { NgModule, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';

// Auth
import { LoginComponent } from './pages/login/login';

// Layout
import { NavbarComponent } from './components/navbar/navbar';
import { NavUserComponent } from './components/nav-user/nav-user';

// Dashboard
import { DashboardComponent } from './pages/dashboard/dashboard';

// Interceptors
import { authInterceptor } from './interceptors/auth-interceptor';
import { logoutInterceptor } from './interceptors/logout-interceptor';

@NgModule({
    declarations: [
        App,
        LoginComponent,
        NavbarComponent,
        NavUserComponent,
        DashboardComponent,
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        NgbModule,
        FormsModule,
        ReactiveFormsModule
    ],
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideHttpClient(withInterceptors([authInterceptor, logoutInterceptor]))
    ],
    bootstrap: [App],
})
export class AppModule {}
