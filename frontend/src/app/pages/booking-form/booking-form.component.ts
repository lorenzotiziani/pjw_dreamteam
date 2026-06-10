import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest, firstValueFrom, map, of, startWith, Subject, switchMap, takeUntil } from 'rxjs';
import { Accessorio } from '../../entities/Accessorio';
import { Copertura } from '../../entities/Copertura';
import { StatoPrenotazione } from '../../entities/prenotazione';
import { AccessorioService } from '../../services/accessorio.service';
import { AuthService } from '../../services/auth.service';
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
  puntoVendita$ = this.puntiVenditaSrv.puntoVendita$;
  accessori$ = this.accessorioSrv.accessorio$;
  coperture$ = this.coperturaSrv.coperture$;

  prezzoTotale = 0;
  orariDisponibili: string[] = [];
  formError = '';

  bikesDisponibiliList: any[] = [];
  copertureList: any[] = [];
  accessoriList: any[] = [];

  // Accessori selezionati (come array di oggetti, per invio e calcolo)
  accessoriSelezionati: Accessorio[] = [];

  bookingForm = this.fb.group({
    data: ['', Validators.required],
    dataRiconsegna: ['', Validators.required],
    puntoVendita: ['', Validators.required],
    ora: ['', Validators.required],
    oraRiconsegna: ['', Validators.required],
    coperturaId: [''],
    righe: this.fb.array([], [Validators.required, Validators.minLength(1)])
  });

  get righeArray(): FormArray {
    return this.bookingForm.get('righe') as FormArray;
  }

  bikesDisponibili$ = combineLatest([
    this.bookingForm.get('puntoVendita')!.valueChanges.pipe(startWith(''))
  ]).pipe(
    switchMap(([puntoVenditaId]) => {
      if (!puntoVenditaId) return of([]);
      return this.puntiVenditaSrv.stock(puntoVenditaId).pipe(
        map(stockArray =>
          stockArray
            .filter(s => s.quantitaTotale > 0)
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

    this.coperture$.pipe(takeUntil(this.destroyed$)).subscribe(list => {
      this.copertureList = list;
      // Pre-seleziona la prima copertura (Nessuna assicurazione) se non già impostata
      if (list.length > 0 && !this.bookingForm.get('coperturaId')?.value) {
        this.bookingForm.patchValue({ coperturaId: list[0].id });
      }
    });
    this.accessori$.pipe(takeUntil(this.destroyed$)).subscribe(list => this.accessoriList = list);

    this.bikesDisponibili$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(list => {
        this.bikesDisponibiliList = list;
        this.calcolaTotale();
      });

    // Ascolto cambi righe (solo tipoBiciId e quantità)
    this.righeArray.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe(() => this.calcolaTotale());

    // Ascolto cambi copertura
    this.bookingForm.get('coperturaId')!.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe(() => this.calcolaTotale());

    // Ascolto cambi date
    combineLatest([
      this.bookingForm.get('data')!.valueChanges.pipe(startWith(this.bookingForm.get('data')!.value)),
      this.bookingForm.get('dataRiconsegna')!.valueChanges.pipe(startWith(this.bookingForm.get('dataRiconsegna')!.value))
    ]).pipe(takeUntil(this.destroyed$)).subscribe(() => this.calcolaTotale());

    this.restoreFormState();
    if (this.righeArray.length === 0) {
      this.aggiungiRiga();
    }
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  aggiungiRiga() {
    const rigaForm = this.fb.group({
      tipoBiciId: ['', Validators.required],
      quantita: [1, [Validators.required, Validators.min(1)]]
    });
    this.righeArray.push(rigaForm);
    this.calcolaTotale();
  }

  rimuoviRiga(index: number) {
    if (this.righeArray.length > 1) {
      this.righeArray.removeAt(index);
      this.calcolaTotale();
    }
  }

  // Gestione accessori globali
  onAccessorioChange(event: any, accessorio: Accessorio) {
    if (event.target.checked) {
      this.accessoriSelezionati.push(accessorio);
    } else {
      this.accessoriSelezionati = this.accessoriSelezionati.filter(a => a.id !== accessorio.id);
    }
    this.calcolaTotale();
  }

  // Gestione copertura (radio button)
  onCoperturaSelezionata(copertura: Copertura) {
    this.bookingForm.patchValue({ coperturaId: copertura.id });
    this.calcolaTotale();
  }

  calcolaTotale() {
    let totale = 0;
    const giorni = this.getGiorniNoleggio();

    if (giorni > 0) {
      for (const riga of this.righeArray.controls) {
        const tipoBiciId = riga.get('tipoBiciId')?.value;
        const quantita = Number(riga.get('quantita')?.value) || 0;
        if (tipoBiciId && quantita > 0) {
          const bici = this.bikesDisponibiliList.find(b => b.id == tipoBiciId);
          if (bici) {
            totale += Number(bici.prezzoMezzaGiornata) * quantita * giorni;
          }
        }
      }
    }

    // Copertura globale
    const coperturaId = this.bookingForm.get('coperturaId')?.value;
    if (coperturaId) {
      const cop = this.copertureList.find(c => c.id == coperturaId);
      if (cop) totale += Number(cop.prezzo);
    }

    // Accessori globali
    for (const acc of this.accessoriSelezionati) {
      totale += Number(acc.prezzo);
    }

    this.prezzoTotale = totale;
  }

  async addPrenotazione() {
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
    const coperturaIdNum = form.coperturaId ? Number(form.coperturaId) : null;

    const accessoriPayload = this.accessoriSelezionati.map(acc => ({
      accessorioId: Number(acc.id),
      quantita: 1
    }));

    const righePayload = this.righeArray.controls.map(riga => ({
      tipoBiciId: Number(riga.get('tipoBiciId')!.value),
      quantita: Number(riga.get('quantita')!.value)
    }));

    const totale = this.prezzoTotale;

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

  private readonly FORM_STORAGE_KEY = 'booking_form_data';

  saveFormState() {
    sessionStorage.setItem(this.FORM_STORAGE_KEY, JSON.stringify(this.bookingForm.value));
  }

  restoreFormState() {
    const saved = sessionStorage.getItem(this.FORM_STORAGE_KEY);
    if (saved) {
      try {
        const formData = JSON.parse(saved);
        if (formData.righe && Array.isArray(formData.righe)) {
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

  onLoginClick() {
    this.saveFormState();
    this.router.navigate(['/login'], { queryParams: { requestedUrl: '/booking/form' } });
  }

  onRegisterClick() {
    this.saveFormState();
    this.router.navigate(['/register'], { queryParams: { requestedUrl: '/booking/form' } });
  }

  private getGiorniNoleggio(): number {
    const dataRitiro = this.bookingForm.get('data')?.value;
    const dataRiconsegna = this.bookingForm.get('dataRiconsegna')?.value;
    if (!dataRitiro || !dataRiconsegna) return 0;
    const inizio = new Date(dataRitiro);
    const fine = new Date(dataRiconsegna);
    if (isNaN(inizio.getTime()) || isNaN(fine.getTime()) || fine <= inizio) return 0;
    const diffTime = fine.getTime() - inizio.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}