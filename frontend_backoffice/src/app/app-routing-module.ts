import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

import { LoginComponent } from './pages/login/login';

import { DashboardComponent } from './pages/dashboard/dashboard';

const routes: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

    // Dashboard (protetta)
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },

    // Auth
    { path: 'login', component: LoginComponent },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
