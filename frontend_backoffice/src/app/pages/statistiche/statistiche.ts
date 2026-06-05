import { Component, OnInit } from '@angular/core';
import { MeseChart, StatoRow, StatsKpi } from '../../components/statistiche-view/statistiche-view';

const MESI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

const STATI_CONFIG = [
  { stato: 'IN_ATTESA',  label: 'In attesa',  colore: '#f59e0b' },
  { stato: 'CONFERMATA', label: 'Confermata', colore: '#3b82f6' },
  { stato: 'RITIRATA',   label: 'Ritirata',   colore: '#8b5cf6' },
  { stato: 'RESTITUITA', label: 'Restituita', colore: '#22c55e' },
  { stato: 'CANCELLATA', label: 'Cancellata', colore: '#94a3b8' },
  { stato: 'DANNO',      label: 'Danno',      colore: '#ef4444' },
  { stato: 'RITARDO',    label: 'Ritardo',    colore: '#f97316' },
];

@Component({
  selector: 'app-statistiche',
  standalone: false,
  templateUrl: './statistiche.html',
  styleUrl: './statistiche.css'
})
export class StatisticheComponent implements OnInit {
  loading    = false;
  filtroAnno = new Date().getFullYear();
  anni: number[] = [];

  kpis: StatsKpi = { ricaviTotali: 0, prenotazioniTotali: 0, completate: 0, mediaRicavo: 0 };

  chartData: MeseChart[] = MESI.map(label => ({ label, value: 0, height: 0 }));

  statoBreakdown: StatoRow[] = STATI_CONFIG.map(({ stato, label, colore }) => ({
    stato, label, colore, count: 0, percent: 0,
  }));

  ngOnInit(): void {
    const cur = new Date().getFullYear();
    this.anni = [cur - 2, cur - 1, cur, cur + 1].filter(a => a > 2020);
  }

  onAnnoChange(anno: number): void {
    this.filtroAnno = anno;
  }
}
