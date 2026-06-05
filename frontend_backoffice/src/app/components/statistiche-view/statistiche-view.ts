import { Component, Input, Output, EventEmitter } from '@angular/core';

export type MeseChart = { label: string; value: number; height: number };
export type StatoRow  = { stato: string; label: string; count: number; percent: number; colore: string };
export type StatsKpi  = { ricaviTotali: number; prenotazioniTotali: number; completate: number; mediaRicavo: number };

@Component({
  selector: 'app-statistiche-view',
  standalone: false,
  templateUrl: './statistiche-view.html',
  styleUrl: './statistiche-view.css'
})
export class StatisticheViewComponent {
  @Input() loading = true;
  @Input() filtroAnno = new Date().getFullYear();
  @Input() anni: number[] = [];
  @Input() kpis: StatsKpi = { ricaviTotali: 0, prenotazioniTotali: 0, completate: 0, mediaRicavo: 0 };
  @Input() chartData: MeseChart[] = [];
  @Input() statoBreakdown: StatoRow[] = [];

  @Output() annoChange = new EventEmitter<number>();

  onAnnoChange(anno: string): void {
    this.annoChange.emit(Number(anno));
  }
}
