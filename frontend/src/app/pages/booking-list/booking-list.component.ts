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
export class BookingListComponent implements OnInit {
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
    const modalRef = this.modalService.open(EditBookingComponent, {
      backdrop: 'static',
      keyboard: true
    });
    modalRef.componentInstance.prenotazioneId = id;
    const triggerButton = document.activeElement as HTMLElement;

    modalRef.result.then((updatedData: any) => {
      // Recupera la prenotazione originale per ottenere lo stato attuale
      const prenotazioneOriginale = this.prenotazioni.find(p => p.id === id);
      if (!prenotazioneOriginale) {
        alert('Prenotazione non trovata nella lista.');
        return;
      }

      // Chiama il servizio con tutti i 10 parametri richiesti
      this.prenotazioniSrv.update(
        Number(id),
        updatedData.dataRitiro,
        updatedData.puntoVenditaId,
        updatedData.oraRitiro,
        updatedData.dataOraRiconsegna,
        updatedData.totale,
        prenotazioneOriginale.stato,
        updatedData.tipoBiciId,
        updatedData.coperturaId ?? null, 
        updatedData.accessoriPayload 
      ).subscribe({
        next: () => {
          this.caricaPrenotazioni();
        },
        error: (err) => {
          console.error('Errore aggiornamento', err);
          alert('Errore durante il salvataggio delle modifiche.');
        }
      });
    }).catch(() => {
    }).finally(() => {
      triggerButton?.focus();
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

  async cancellaPrenotazione(id: string) {
    const conferma = confirm('Sei sicuro di voler cancellare questa prenotazione?');
    if (!conferma) return;

    this.prenotazioniSrv.delete(Number(id)).subscribe({
      next: () => {
        this.prenotazioni = this.prenotazioni.filter(p => p.id !== id);
      },
      error: (err) => {
        console.error('Errore cancellazione', err);
        alert('Errore durante la cancellazione.');
      }
    });
  }
}