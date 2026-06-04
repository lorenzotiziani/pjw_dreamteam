import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

import { LoginComponent } from './pages/login/login';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { PrenotazioniComponent } from './pages/prenotazioni/prenotazioni';
import { PuntiVenditaComponent } from './pages/punti-vendita/punti-vendita';
import { TipiBiciComponent } from './pages/tipi-bici/tipi-bici';
import { AccessoriComponent } from './pages/accessori/accessori';
import { CoperatureComponent } from './pages/coperture/coperture';
import { roleGuard } from './guards/role.guard';

const routes: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    { path: 'login',         component: LoginComponent },
    { path: 'dashboard',     component: DashboardComponent,    canActivate: [roleGuard, authGuard] },
    { path: 'prenotazioni',  component: PrenotazioniComponent, canActivate: [roleGuard, authGuard] },
    { path: 'tipi-bici',     component: TipiBiciComponent,     canActivate: [roleGuard, authGuard] },
    { path: 'accessori',     component: AccessoriComponent,    canActivate: [roleGuard, authGuard] },
    { path: 'coperture',     component: CoperatureComponent,   canActivate: [roleGuard, authGuard] },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
