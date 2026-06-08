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
}