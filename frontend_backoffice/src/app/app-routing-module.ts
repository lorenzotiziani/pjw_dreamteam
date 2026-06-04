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
    { path: 'dashboard',     component: DashboardComponent,    canActivate: [authGuard, roleGuard] },
    { path: 'prenotazioni',   component: PrenotazioniComponent, canActivate: [authGuard, roleGuard] },
    { path: 'punti-vendita',  component: PuntiVenditaComponent, canActivate: [authGuard, roleGuard] },
    { path: 'tipi-bici',      component: TipiBiciComponent,     canActivate: [authGuard, roleGuard] },
    { path: 'accessori',     component: AccessoriComponent,    canActivate: [authGuard, roleGuard] },
    { path: 'coperture',     component: CoperatureComponent,   canActivate: [authGuard, roleGuard] },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
