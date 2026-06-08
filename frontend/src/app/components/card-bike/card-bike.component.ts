import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Prenotazione } from '../../entities/prenotazione'; // Importa il tipo

@Component({
  selector: 'app-card-bike',
  standalone: false,
  templateUrl: './card-bike.component.html',
  styleUrl: './card-bike.component.css',
})
export class CardBikeComponent {
  @Input() 
  prenotazione!: Prenotazione;
  @Input() 
  showActions: boolean = true;
  @Output() 
  cancella = new EventEmitter<string>();
  @Output() 
  modifica = new EventEmitter<string>();

  onCancella() {
    this.cancella.emit(this.prenotazione.id);
  }

  onModifica() {
    this.modifica.emit(this.prenotazione.id);
  }

  scadenza(date: string): boolean {
    if (!date) return false;
    const dataRitiro = new Date(date);
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    dataRitiro.setHours(0, 0, 0, 0);
    const diffMs = dataRitiro.getTime() - oggi.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays > 2; // mostra bottoni se mancano meno di 2 giorni (incluso oggi)
  }
}