import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { PuntoVendita } from '../../entities/punto-vendita.entity';

@Component({
  selector: 'app-punto-vendita-card',
  standalone: false,
  templateUrl: './punto-vendita-card.html',
  styleUrl: './punto-vendita-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PuntoVenditaCardComponent {
  @Input() puntoVendita!: PuntoVendita;
  /** Solo l'ADMIN vede i pulsanti di modifica/disattivazione/eliminazione. */
  @Input() isAdmin = false;
  @Output() edit = new EventEmitter<PuntoVendita>();
  @Output() delete = new EventEmitter<number>();
  @Output() toggleAttivo = new EventEmitter<PuntoVendita>();
  @Output() manageStock = new EventEmitter<PuntoVendita>();

  get totaleBici(): number {
    return (this.puntoVendita.stockBici ?? []).reduce((s, i) => s + i.quantitaTotale, 0);
  }

  get inManutenzione(): number {
    return (this.puntoVendita.stockBici ?? []).reduce((s, i) => s + i.quantitaManutenzione, 0);
  }

  get disponibili(): number {
    return (this.puntoVendita.stockBici ?? []).reduce((s, i) => s + (i.quantitaAttuale ?? 0), 0);
  }
}
