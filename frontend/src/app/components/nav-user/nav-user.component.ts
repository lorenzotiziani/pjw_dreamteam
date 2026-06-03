import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '../../entities/User';

@Component({
  selector: 'app-nav-user',
  standalone: false,
  templateUrl: './nav-user.component.html',
  styleUrl: './nav-user.component.css',
})
export class NavUserComponent {
  @Input()
  user!: User;

  @Output()
  logout = new EventEmitter<void>();

  onLogoutClick(){
    this.logout.emit();
  }
}
