import { Component, inject, OnInit } from '@angular/core';
import { PrenotazioneService } from '../../services/prenotazione.service';
import { Prenotazione, StatoPrenotazione } from '../../entities/prenotazione';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EditBookingComponent } from '../../components/modals/edit-booking/edit-booking.component';
import { Accessorio } from '../../entities/Accessorio';

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

  openModal(id: number) {
    this.modalService.open(EditBookingComponent).result
      .then((formValues) => {
        this.prenotazioniSrv.update(id, formValues.dataRitiro, formValues.puntoVenditaId, formValues.oraRitiro, formValues.dataOraRiconsegna,
         formValues.totale, StatoPrenotazione.CONFERMATA, formValues.tipoBiciId,  formValues.coperturaId,  this.accessoriPayload
        );
      });
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

  async cancellaPrenotazione(id: number) {
    const conferma = confirm('Sei sicuro di voler cancellare questa prenotazione?');
    if (!conferma) return;

    this.prenotazioniSrv.delete(id).subscribe({
      next: () => {
        // Rimuovi dalla lista locale
        this.prenotazioni = this.prenotazioni.filter(p => Number(p.id) !== id);
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
