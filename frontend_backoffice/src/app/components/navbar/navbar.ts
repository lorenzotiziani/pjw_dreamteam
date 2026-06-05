import { Component, inject, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})

export class NavbarComponent implements OnInit {
  protected authSrv = inject(AuthService);
  protected router = inject(Router);

  currentUser$ = this.authSrv.currentUser$;

  ngOnInit(): void {
    // Chiude tutti i dropdown Bootstrap aperti dopo ogni navigazione Angular (SPA)
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.closeAllDropdowns());
  }

  private closeAllDropdowns(): void {
    if (typeof window === 'undefined') return;
    const bs = (window as any)['bootstrap'];
    if (!bs?.Dropdown) return;
    document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(el => {
      const d = bs.Dropdown.getInstance(el);
      d?.hide();
    });
  }

  logout() {
    this.authSrv.logout();
    this.router.navigate(['/login']);
  }

}