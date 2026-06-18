import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Prenotazione, RigaPrenotazione } from '../../entities/prenotazione';

export interface RigaGruppata {
  tipoBici: RigaPrenotazione['tipoBici'];
  copertura: RigaPrenotazione['copertura'] | null;
  accessori: RigaPrenotazione['accessori'];
  quantita: number;
}

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

  onCancella() { this.cancella.emit(this.prenotazione.id); }
  onModifica()  { this.modifica.emit(this.prenotazione.id); }

  /** Nome categoria leggibile: CITY_BIKE → "City Bike". */
  formatCategoria(categoria: string): string {
    const map: Record<string, string> = {
      CITY_BIKE: 'City Bike',
      MOUNTAIN_BIKE: 'Mountain Bike',
      GRAVEL: 'Gravel',
      ROAD_BIKE: 'Road Bike'
    };
    return map[categoria] ?? categoria;
  }

  /** Motorizzazione leggibile: ELETTRICA → "Elettrica", NORMALE → "Muscolare". */
  formatMotorizzazione(motorizzazione: string): string {
    return motorizzazione === 'ELETTRICA' ? 'Elettrica' : 'Muscolare';
  }

  /**
   * Raggruppa le righe con stessa bici + stessa copertura + stessi accessori.
   * Poiché quando si prenotano N bici dello stesso tipo vengono assegnati
   * sempre gli stessi accessori/assicurazione, mostriamo "N× TipoBici".
   */
  get righeRaggruppate(): RigaGruppata[] {
    const map = new Map<string, RigaGruppata>();

    for (const riga of (this.prenotazione?.righe ?? [])) {
      // Chiave: tipoBiciId + coperturaId + ids accessori ordinati
      const accIds = (riga.accessori ?? [])
        .map(a => a.accessorioId)
        .sort()
        .join(',');
      const key = `${riga.tipoBiciId}-${riga.coperturaId ?? 'null'}-${accIds}`;

      if (map.has(key)) {
        map.get(key)!.quantita++;
      } else {
        map.set(key, {
          tipoBici:  riga.tipoBici,
          copertura: riga.copertura ?? null,
          accessori: riga.accessori ?? [],
          quantita:  1,
        });
      }
    }

    return Array.from(map.values());
  }

  /**
   * Restituisce il range orario di ritiro come "HH:mm — HH+1:mm".
   * oraRitiro arriva dal backend come stringa ISO (es. "1970-01-01T10:00:00.000Z").
   * Usiamo le ore UTC perché il backend le salva e le restituisce in UTC.
   */
  getRangeOraRitiro(oraRitiro: string): string {
    if (!oraRitiro) return '';
    const d = new Date(oraRitiro);
    const p = (n: number) => n.toString().padStart(2, '0');
    const hStart = d.getUTCHours();
    const hEnd = hStart + 1;
    return `${p(hStart)}:00 — ${p(hEnd)}:00`;
  }

  /**
   * Restituisce il range orario di riconsegna come "HH-1:mm — HH:mm".
   * dataOraRiconsegna è salvata come ora di FINE fascia in UTC
   * (es. "2026-06-30T18:00:00.000Z" = fascia "17:00 — 18:00").
   */
  getRangeOraRiconsegna(dataOraRiconsegna: string): string {
    if (!dataOraRiconsegna) return '';
    const d = new Date(dataOraRiconsegna);
    const p = (n: number) => n.toString().padStart(2, '0');
    const hEnd = d.getUTCHours();
    const hStart = hEnd - 1;
    return `${p(hStart)}:00 — ${p(hEnd)}:00`;
  }

  scadenza(date: string): boolean {
    if (!date) return false;
    const dataRitiro = new Date(date);
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    dataRitiro.setHours(0, 0, 0, 0);
    const diffMs = dataRitiro.getTime() - oggi.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays > 2;
  }
}