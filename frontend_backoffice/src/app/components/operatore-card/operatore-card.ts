import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Operatore } from '../../entities/operatore.entity';

@Component({
  selector: 'app-operatore-card',
  standalone: false,
  templateUrl: './operatore-card.html',
  styleUrl:    './operatore-card.css'
})
export class OperatoreCardComponent {
  @Input() operatore!: Operatore;
  @Output() toggle = new EventEmitter<Operatore>();

  get initials(): string {
    const f = this.operatore?.nome?.[0] ?? '';
    const l = this.operatore?.cognome?.[0] ?? '';
    return (f + l).toUpperCase();
  }

  get avatarColor(): string {
    const palette = ['#4f46e5','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
    const seed = (this.operatore?.nome ?? '') + (this.operatore?.cognome ?? '');
    let hash = 0;
    for (const c of seed) hash = c.charCodeAt(0) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  }
}
