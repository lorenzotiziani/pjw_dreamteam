import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-nav-bar',
  standalone: false,
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.css',
})
export class NavBarComponent {
  protected authSrv = inject(AuthService);
  protected router = inject(Router)
  currentUser$ = this.authSrv.currentUser$;

  routeHome(){
    this.router.navigate([`/`])
  }

  routeForm(){
    this.router.navigate([`/booking/form`])
  }

  logout() {
    this.authSrv.logout();
    this.router.navigate(['/login'])
  }

  login(){
    this.router.navigate(['/login']) 
  }
}
