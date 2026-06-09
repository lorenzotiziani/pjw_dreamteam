import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest, firstValueFrom, map, of, startWith, Subject, switchMap, takeUntil } from 'rxjs';
import { Accessorio } from '../../entities/Accessorio';
import { TipoBici } from '../../entities/Bike';
import { Copertura } from '../../entities/Copertura';
import { StatoPrenotazione } from '../../entities/prenotazione';
import { AccessorioService } from '../../services/accessorio.service';
import { AuthService } from '../../services/auth.service';
import { BikeService } from '../../services/bike.service';
import { CoperturaService } from '../../services/copertura.service';
import { PrenotazioneService } from '../../services/prenotazione.service';
import { PuntoVenditaService } from '../../services/punto-vendita.service';
import { LogicaService } from '../../services/logica.service';

@Component({
  selector: 'app-booking-form',
  standalone: false,
  templateUrl: './booking-form.component.html',
  styleUrls: ['./booking-form.component.css'],
})
export class BookingFormComponent implements OnInit, OnDestroy {
  protected fb = inject(FormBuilder);
  protected authSrv = inject(AuthService);
  protected router = inject(Router);

  protected puntiVenditaSrv = inject(PuntoVenditaService);
  protected coperturaSrv = inject(CoperturaService);
  protected prenotazioneSrv = inject(PrenotazioneService);
  protected accessorioSrv = inject(AccessorioService);
  protected logicSrv = inject(LogicaService);

  protected destroyed$ = new Subject<void>();

  user$ = this.authSrv.currentUser$;

  prezzoTotale = 0;
  orariDisponibili: string[] = [];
  coperturaSelezionata: Copertura | null = null;
  accessoriSelezionati: Accessorio[] = [];

  puntoVendita$ = this.puntiVenditaSrv.puntoVendita$;
  accessori$ = this.accessorioSrv.accessorio$;
  coperture$ = this.coperturaSrv.coperture$;

  formError = '';

  // Lista locale delle bici disponibili (per calcolare il totale)
  bikesDisponibiliList: any[] = [];

  // Form principale: rimosso tipoBiciId, aggiunto FormArray righe
  bookingForm = this.fb.group({
    data: ['', Validators.required],
    dataRiconsegna: ['', Validators.required],
    puntoVendita: ['', Validators.required],
    ora: ['', Validators.required],
    oraRiconsegna: ['', Validators.required],
    coperturaId: [''],
    righe: this.fb.array([], [Validators.required, Validators.minLength(1)])  // almeno una riga
  });

  // Getter per il FormArray
  get righeArray(): FormArray {
    return this.bookingForm.get('righe') as FormArray;
  }

  // Observable per le bici disponibili nel punto vendita selezionato
  bikesDisponibili$ = combineLatest([
    this.bookingForm.get('puntoVendita')!.valueChanges.pipe(startWith(''))
  ]).pipe(
    switchMap(([puntoVenditaId]) => {
      if (!puntoVenditaId) return of([]);
      return this.puntiVenditaSrv.stock(puntoVenditaId).pipe(
        map(stockArray =>
          stockArray
            .filter(s => s.quantitaTotale > 0)  // solo bici con stock
            .map(s => ({
              ...s.tipoBici,
              id: String(s.tipoBici.id),
              prezzoMezzaGiornata: Number(s.tipoBici.prezzoMezzaGiornata)
            }))
        )
      );
    })
  );

  ngOnInit() {
    this.orariDisponibili = this.logicSrv.generaOrariDisponibili();
    this.restoreFormState();

    // Aggiungi una riga vuota se non presente (es. dopo ripristino o all'inizio)
    if (this.righeArray.length === 0) {
      this.aggiungiRiga();
    }

    // Mantieni aggiornata la lista locale delle bici
    this.bikesDisponibili$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(list => {
        this.bikesDisponibiliList = list;
        this.calcolaTotale(); // ricalcola il totale ogni volta che cambia la lista
      });

    // Ascolta i cambiamenti nelle righe per ricalcolare il totale
    this.righeArray.valueChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => this.calcolaTotale());
  }

  // Aggiunge una nuova riga bici
  aggiungiRiga() {
    const rigaForm = this.fb.group({
      tipoBiciId: ['', Validators.required],
      quantita: [1, [Validators.required, Validators.min(1)]]
    });
    this.righeArray.push(rigaForm);
  }

  // Rimuove una riga bici
  rimuoviRiga(index: number) {
    if (this.righeArray.length > 1) {
      this.righeArray.removeAt(index);
      this.calcolaTotale();
    }
  }

  // Gestione accessori
  onAccessorioChange(event: any, accessorio: Accessorio) {
    if (event.target.checked) {
      this.accessoriSelezionati.push(accessorio);
    } else {
      this.accessoriSelezionati = this.accessoriSelezionati.filter(a => a.id !== accessorio.id);
    }
    this.calcolaTotale();
  }

  // Gestione copertura
  onCoperturaSelezionata(copertura: Copertura) {
    this.coperturaSelezionata = copertura;
    this.bookingForm.patchValue({ coperturaId: copertura.id });
    this.calcolaTotale();
  }

  // Calcolo del totale
  calcolaTotale() {
    let totale = 0;

    // Somma per ogni riga
    for (const riga of this.righeArray.controls) {
      const tipoBiciId = riga.get('tipoBiciId')?.value;
      const quantita = Number(riga.get('quantita')?.value) || 0;
      if (tipoBiciId && quantita > 0) {
        const bici = this.bikesDisponibiliList.find(b => b.id == tipoBiciId);
        if (bici) {
          totale += Number(bici.prezzoMezzaGiornata) * quantita;
        }
      }
    }

    // Copertura
    if (this.coperturaSelezionata) {
      totale += Number(this.coperturaSelezionata.prezzo);
    }

    // Accessori
    for (const acc of this.accessoriSelezionati) {
      totale += Number(acc.prezzo);
    }

    this.prezzoTotale = totale;
  }

  // Invio della prenotazione
  async addPrenotazione() {
    // Validazione lato componente
    if (this.bookingForm.invalid || this.righeArray.length === 0) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    const user = await firstValueFrom(this.user$);
    if (!user || !user.id) {
      this.router.navigate(['/login'], { queryParams: { requestedUrl: '/booking/form' } });
      return;
    }

    const form = this.bookingForm.value;
    const dataRitiro = new Date(form.data!);
    const dataRiconsegna = new Date(form.dataRiconsegna!);
    const oraRitiroTime = this.logicSrv.fasciaToOraTime(form.ora!);
    const dataOraRiconsegna = this.logicSrv.fasciaToDate(dataRiconsegna, form.oraRiconsegna!);

    const utenteIdNum = Number(user.id);
    const puntoVenditaIdNum = Number(form.puntoVendita);
    const coperturaIdNum = this.coperturaSelezionata?.id ? Number(this.coperturaSelezionata.id) : null;

    const accessoriPayload = this.accessoriSelezionati.map(acc => ({
      accessorioId: Number(acc.id),
      quantita: 1
    }));

    // Estrai le righe dal form
    const righePayload = this.righeArray.controls.map(riga => ({
      tipoBiciId: Number(riga.get('tipoBiciId')!.value),
      quantita: Number(riga.get('quantita')!.value)
    }));

    const totale = this.prezzoTotale;

    // Chiama il nuovo metodo addMultiRighe (vedi sotto)
    this.prenotazioneSrv.addMultiRighe(
      utenteIdNum,
      dataRitiro,
      puntoVenditaIdNum,
      oraRitiroTime,
      dataOraRiconsegna,
      totale,
      StatoPrenotazione.CONFERMATA,
      coperturaIdNum,
      accessoriPayload,
      righePayload
    ).subscribe({
      next: () => this.router.navigate(['/booking/list']),
      error: (err) => {
        this.formError = err.error?.message || 'Errore sconosciuto durante la prenotazione.';
      }
    });
  }

  // Salvataggio e ripristino dello stato del form
  private readonly FORM_STORAGE_KEY = 'booking_form_data';

  saveFormState() {
    sessionStorage.setItem(this.FORM_STORAGE_KEY, JSON.stringify(this.bookingForm.value));
  }

  restoreFormState() {
    const saved = sessionStorage.getItem(this.FORM_STORAGE_KEY);
    if (saved) {
      try {
        const formData = JSON.parse(saved);
        // Attenzione: il ripristino del FormArray richiede un trattamento speciale
        // Per semplicità, assumiamo che il form salvato contenga già l'array righe.
        // Se non è presente, patchiamo solo i campi semplici e aggiungiamo una riga vuota.
        if (formData.righe && Array.isArray(formData.righe)) {
          // Rimuovi le righe attuali e ricrea quelle salvate
          while (this.righeArray.length) this.righeArray.removeAt(0);
          formData.righe.forEach((riga: any) => {
            this.righeArray.push(this.fb.group({
              tipoBiciId: [riga.tipoBiciId || '', Validators.required],
              quantita: [riga.quantita || 1, [Validators.required, Validators.min(1)]]
            }));
          });
          delete formData.righe;
        }
        this.bookingForm.patchValue(formData);
        sessionStorage.removeItem(this.FORM_STORAGE_KEY);
      } catch (e) {
        console.error('Errore nel ripristino del form', e);
      }
    }
  }

  // Navigazione autenticazione
  onLoginClick() {
    this.saveFormState();
    this.router.navigate(['/login'], { queryParams: { requestedUrl: '/booking/form' } });
  }

  onRegisterClick() {
    this.saveFormState();
    this.router.navigate(['/register'], { queryParams: { requestedUrl: '/booking/form' } });
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}