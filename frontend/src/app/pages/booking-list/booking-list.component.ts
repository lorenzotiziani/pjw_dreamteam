import { Component, inject, OnInit } from '@angular/core';
import { PrenotazioneService } from '../../services/prenotazione.service';
import { Prenotazione, StatoPrenotazione } from '../../entities/prenotazione';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EditBookingComponent } from '../../components/modals/edit-booking/edit-booking.component';
import { Accessorio } from '../../entities/Accessorio';
import { LogicaService } from '../../services/logica.service';

@Component({
  selector: 'app-booking-list',
  standalone: false,
  templateUrl: './booking-list.component.html',
  styleUrl: './booking-list.component.css',
})
export class BookingListComponent implements OnInit{
  protected prenotazioniSrv = inject(PrenotazioneService);
  protected authSrv = inject(AuthService);
  protected router = inject(Router);
  protected modalService = inject(NgbModal);
  protected logicSrv = inject(LogicaService);

  prenotazioni: Prenotazione[] = [];
  loading = false;
  error: string | null = null;

  accessoriSelezionati: Accessorio[] = [];

  accessoriPayload = this.accessoriSelezionati.map(acc => ({
    accessorioId: Number(acc.id),
    quantita: 1
  }));

  ngOnInit(): void {
    this.caricaPrenotazioni();
  }

  openModal(id: string) {
    const modalRef = this.modalService.open(EditBookingComponent);
    modalRef.componentInstance.prenotazioneId = id;
    modalRef.result.catch(() => {}); // evita errore unhandled promise
  }

  caricaPrenotazioni() {
    this.prenotazioniSrv.mie().subscribe({
      next: (data) => {
        this.prenotazioni = data;
        this.loading = false;
        console.log(data);
      },
      error: (err) => {
        console.error('Errore nel caricamento', err);
        this.error = 'Impossibile caricare le prenotazioni.';
        this.loading = false;
      }
    });
  }

  async cancellaPrenotazione(id: string) {
    const conferma = confirm('Sei sicuro di voler cancellare questa prenotazione?');
    if (!conferma) return;

    this.prenotazioniSrv.delete(Number(id)).subscribe({
      next: () => {
        // Rimuovi dalla lista locale
        this.prenotazioni = this.prenotazioni.filter(p => p.id !== id);
      },
      error: (err) => {
        console.error('Errore cancellazione', err);
        alert('Errore durante la cancellazione.');
      }
    });
  }

  scadenza(date: Date): boolean {
    if (!date) return false;
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    return diffMs > 0 && diffDays < 2;
  }
}
