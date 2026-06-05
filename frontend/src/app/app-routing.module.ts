import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { HomeComponent } from './pages/home/home.component';
import { BookingComponent } from './pages/booking/booking.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { BookingFormComponent } from './pages/booking-form/booking-form.component';
import { BookingListComponent } from './pages/booking-list/booking-list.component';

const routes: Routes = [
  {
    path: 'login',
    component:LoginComponent,
  },
  {
    path: 'register',
    component:RegisterComponent,
  },
  {
    path:'homepage',
    component:HomeComponent
  },
  {
    path:'booking',
    component: BookingComponent,
    children:[
      {
        path:'form',
        component:BookingFormComponent
      },
      {
        path:'list',
        component:BookingListComponent
      }
    ]
  },
  {
    path:'',
    redirectTo:'/homepage',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes),
    FontAwesomeModule
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
