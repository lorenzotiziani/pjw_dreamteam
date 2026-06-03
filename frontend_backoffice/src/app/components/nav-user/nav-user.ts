import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { User } from '../../entities/user.entity';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-nav-user',
  standalone: false,
  templateUrl: './nav-user.html',
  styleUrl: './nav-user.css',
})

export class NavUserComponent {
  protected authSrv = inject(AuthService);

  @Input()
  user: User | null = null;

  @Output()
  logout = new EventEmitter<void>();

  onLogout() {
    this.logout.emit();
  }

  get initials(): string {
    const f = this.user?.nome?.[0] ?? '';
    const l = this.user?.cognome?.[0] ?? '';
    return (f + l).toUpperCase();
  }

  get avatarColor(): string {
    const palette = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const name = (this.user?.nome ?? '') + (this.user?.cognome ?? '');
    let hash = 0;
    for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  }
}