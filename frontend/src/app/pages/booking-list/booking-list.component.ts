import { Component, inject, OnInit } from '@angular/core';
import { PrenotazioneService } from '../../services/prenotazione.service';
import { Prenotazione, StatoPrenotazione } from '../../entities/prenotazione';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EditBookingComponent } from '../../components/modals/edit-booking/edit-booking.component';
import { LogicaService } from '../../services/logica.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmModalService } from '../../services/confirm-modal.service';

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
  protected toastSrv = inject(ToastService);
  protected confirmSrv = inject(ConfirmModalService);

  prenotazioni: Prenotazione[] = [];
  loading = false;
  error: string | null = null;
  cancellingId: string | null = null;

  // Filtro per stato attivo ('TUTTE' = nessun filtro)
  statoFiltro: StatoPrenotazione | 'TUTTE' = 'TUTTE';

  // Filtri mostrati in alto (ordine = ciclo di vita della prenotazione)
  readonly filtri: { label: string; value: StatoPrenotazione | 'TUTTE' }[] = [
    { label: 'Tutte',      value: 'TUTTE' },
    { label: 'Confermata', value: StatoPrenotazione.CONFERMATA },
    { label: 'In attesa',  value: StatoPrenotazione.IN_ATTESA },
    { label: 'Ritirata',   value: StatoPrenotazione.RITIRATA },
    { label: 'Restituita', value: StatoPrenotazione.RESTITUITA },
    { label: 'Cancellata', value: StatoPrenotazione.CANCELLATA },
    { label: 'Danno',      value: StatoPrenotazione.DANNO },
    { label: 'Ritardo',    value: StatoPrenotazione.RITARDO },
  ];

  ngOnInit(): void {
    this.caricaPrenotazioni();
  }

  /** Prenotazioni mostrate in base al filtro stato selezionato. */
  get prenotazioniFiltrate(): Prenotazione[] {
    if (this.statoFiltro === 'TUTTE') return this.prenotazioni;
    return this.prenotazioni.filter(p => p.stato === this.statoFiltro);
  }

  /** Numero di prenotazioni per uno stato (per il badge accanto al filtro). */
  contaPerStato(value: StatoPrenotazione | 'TUTTE'): number {
    if (value === 'TUTTE') return this.prenotazioni.length;
    return this.prenotazioni.filter(p => p.stato === value).length;
  }

  setFiltro(value: StatoPrenotazione | 'TUTTE'): void {
    this.statoFiltro = value;
  }

  openModal(id: string) {
    const modalRef = this.modalService.open(EditBookingComponent, {
      backdrop: 'static',
      keyboard: true
    });
    modalRef.componentInstance.prenotazioneId = id;
    const triggerButton = document.activeElement as HTMLElement;

    modalRef.result.then((updatedData: any) => {
      const prenotazioneOriginale = this.prenotazioni.find(p => p.id === id);
      if (!prenotazioneOriginale) {
        this.toastSrv.error('Prenotazione non trovata nella lista.');
        return;
      }

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
        updatedData.accessoriPayload,
        updatedData.numeroBici
      ).subscribe({
        next: () => {
          this.toastSrv.success('Prenotazione aggiornata con successo.');
          this.caricaPrenotazioni();
        },
        error: (err) => {
          console.error('Errore aggiornamento', err);
          this.toastSrv.error(err.error?.message || 'Errore durante il salvataggio delle modifiche.');
        }
      });
    }).catch(() => {
      // modal dismiss
    }).finally(() => {
      triggerButton?.focus();
    });
  }

  caricaPrenotazioni() {
    this.loading = true;
    this.error = null;
    this.prenotazioniSrv.mie().subscribe({
      next: (data) => {
        // Mostra tutte le prenotazioni: lo stato effettivo è visibile sulla card
        // e filtrabile dai pulsanti in alto.
        this.prenotazioni = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Errore nel caricamento', err);
        this.error = 'Impossibile caricare le prenotazioni.';
        this.loading = false;
      }
    });
  }

  async cancellaPrenotazione(id: string) {
    const conferma = await this.confirmSrv.confirm({
      title: 'Cancella prenotazione',
      message: 'Sei sicuro di voler cancellare questa prenotazione?',
      detail: 'L\'operazione non può essere annullata.',
      confirmLabel: 'Sì, cancella',
      cancelLabel: 'Annulla',
      type: 'danger'
    });
    if (!conferma) return;

    this.cancellingId = id;
    // Chiama PATCH /api/prenotazioni/:id/stato con { stato: 'CANCELLATA' }
    // (soft delete: la prenotazione resta nel DB ma non compare più nella lista)
    this.prenotazioniSrv.cancellaStato(Number(id)).subscribe({
      next: () => {
        // Ricarica: la prenotazione resta in lista ma ora con stato CANCELLATA
        this.cancellingId = null;
        this.toastSrv.success('Prenotazione cancellata.');
        this.caricaPrenotazioni();
      },
      error: (err) => {
        console.error('Errore cancellazione', err);
        this.toastSrv.error(err.error?.message || 'Errore durante la cancellazione.');
        this.cancellingId = null;
      }
    });
  }
}