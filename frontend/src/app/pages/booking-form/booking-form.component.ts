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
import { ToastService } from '../../services/toast.service';

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
  protected toastSrv = inject(ToastService);

  protected destroyed$ = new Subject<void>();

  user$ = this.authSrv.currentUser$;
  puntoVendita$ = this.puntiVenditaSrv.puntoVendita$;
  accessori$ = this.accessorioSrv.accessorio$;
  coperture$ = this.coperturaSrv.coperture$;

  orariDisponibili: string[] = [];
  orariRiconsegna: string[] = [];
  formError = '';
  minDate: string = new Date().toISOString().split('T')[0];

  bikesDisponibiliList: any[] = [];
  copertureList: any[] = [];
  accessoriList: any[] = [];

  // Accessori selezionati (come array di oggetti, per invio e calcolo)
  accessoriSelezionati: Accessorio[] = [];

  // Id accessori in attesa di essere riapplicati dopo il ripristino dal sessionStorage
  private pendingAccessoriIds: string[] = [];

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
            // Solo le bici realmente disponibili: quantitaAttuale tiene già conto
            // di manutenzione e prenotazioni in corso (il backend la decrementa).
            .filter(s => s.quantitaAttuale > 0)
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
    this.orariRiconsegna = this.logicSrv.generaOrariDisponibili();

    // Le fasce di ritiro dipendono dalla data di ritiro,
    // quelle di riconsegna dalla data di riconsegna: il troncamento delle ore
    // passate scatta solo se quella specifica data è oggi.
    this.bookingForm.get('data')!.valueChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe(data => this.aggiornaOrariDisponibili(data ?? ''));

    this.bookingForm.get('dataRiconsegna')!.valueChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe(data => this.aggiornaOrariRiconsegna(data ?? ''));

    this.coperture$.pipe(takeUntil(this.destroyed$)).subscribe(list => {
      this.copertureList = list;
      // Pre-seleziona la prima copertura (Nessuna assicurazione) se non già impostata
      if (list.length > 0 && !this.bookingForm.get('coperturaId')?.value) {
        this.bookingForm.patchValue({ coperturaId: list[0].id });
      }
    });
    this.accessori$.pipe(takeUntil(this.destroyed$)).subscribe(list => {
      this.accessoriList = list;
      // Riapplica gli accessori ripristinati dal sessionStorage una volta che la lista è disponibile
      this.applyPendingAccessori();
    });

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

  /** True se l'accessorio è tra quelli selezionati (per il binding [checked] dei checkbox). */
  isAccessorioSelezionato(id: any): boolean {
    return this.accessoriSelezionati.some(a => String(a.id) === String(id));
  }

  /** Riapplica gli accessori salvati (per id) dopo che la lista accessori è caricata. */
  private applyPendingAccessori() {
    if (!this.pendingAccessoriIds.length || !this.accessoriList.length) return;
    this.accessoriSelezionati = this.accessoriList.filter(a =>
      this.pendingAccessoriIds.includes(String(a.id))
    );
  }

  // Gestione copertura (radio button)
  onCoperturaSelezionata(copertura: Copertura) {
    this.bookingForm.patchValue({ coperturaId: copertura.id });
    this.calcolaTotale();
  }

  /**
   * Totale stimato — getter computato.
   * Angular lo rivaluta ad ogni ciclo di change detection:
   * nessun problema di timing/subscription, sempre aggiornato.
   */
  get prezzoTotale(): number {
    const mezzeGiornate = this.getMezzeGiornate();

    type RigaVal = { tipoBiciId: string; quantita: number };
    const righeValide = (this.righeArray.value as RigaVal[])
      .filter(r => r.tipoBiciId);

    const totaleBici = righeValide.reduce(
      (sum, r) => sum + (Number(r.quantita) || 0), 0
    );

    let totale = 0;

    // Bici: prezzoMezzaGiornata × quantità × mezzeGiornate
    if (mezzeGiornate > 0) {
      for (const r of righeValide) {
        const bici = this.bikesDisponibiliList.find(b => b.id == r.tipoBiciId);
        if (bici) {
          totale += Number(bici.prezzoMezzaGiornata) * (Number(r.quantita) || 0) * mezzeGiornate;
        }
      }
    }

    // Copertura: costo fisso × totaleBici (non dipende dalla durata)
    const coperturaId = this.bookingForm.get('coperturaId')?.value;
    if (coperturaId && totaleBici > 0) {
      const cop = this.copertureList.find(c => c.id == coperturaId);
      if (cop) totale += Number(cop.prezzo) * totaleBici;
    }

    // Accessori: costo fisso × totaleBici (non dipende dalla durata)
    for (const acc of this.accessoriSelezionati) {
      totale += Number(acc.prezzo) * totaleBici;
    }

    return totale;
  }

  /** Mantenuto per retrocompatibilità con i call-site — il getter sopra è la sorgente di verità. */
  calcolaTotale() { /* intentionally empty */ }

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
      next: () => {
        // Prenotazione completata: ripuliamo lo stato salvato del form
        sessionStorage.removeItem(this.FORM_STORAGE_KEY);
        this.toastSrv.success('Prenotazione confermata con successo!');
        this.router.navigate(['/booking/list']);
      },
      error: (err) => {
        const raw = err.error?.message || 'Errore sconosciuto durante la prenotazione.';
        this.formError = this.humanizeError(raw);
        this.toastSrv.error(this.formError);
      }
    });
  }

  /**
   * Rende leggibili i messaggi di errore del backend che usano l'id della bici.
   * Es: "Bici 1 non disponibile..." → "CITY_BIKE (taglia M) non disponibile..."
   */
  private humanizeError(msg: string): string {
    return msg.replace(/Bici\s+(\d+)/g, (match, id) => {
      const bici = this.bikesDisponibiliList.find(b => String(b.id) === String(id));
      return bici ? `${bici.categoria} (taglia ${bici.taglia})` : match;
    });
  }

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

  private readonly FORM_STORAGE_KEY = 'booking_form_data';

  saveFormState() {
    const state = {
      ...this.bookingForm.value,
      // Gli accessori non sono nel form: li salviamo a parte come lista di id
      accessoriIds: this.accessoriSelezionati.map(a => String(a.id))
    };
    sessionStorage.setItem(this.FORM_STORAGE_KEY, JSON.stringify(state));
  }

  restoreFormState() {
    const saved = sessionStorage.getItem(this.FORM_STORAGE_KEY);
    if (!saved) return;
    try {
      const formData = JSON.parse(saved);

      // Accessori: memorizziamo gli id e li riapplichiamo quando la lista è pronta
      this.pendingAccessoriIds = Array.isArray(formData.accessoriIds)
        ? formData.accessoriIds.map((id: any) => String(id))
        : [];
      delete formData.accessoriIds;
      this.applyPendingAccessori();

      // Righe (FormArray): ricostruite manualmente
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
      // NB: non rimuoviamo qui il sessionStorage. Lo stato sopravvive al percorso
      // login/register/verifica-email finché la prenotazione non va a buon fine.
    } catch (e) {
      console.error('Errore nel ripristino del form', e);
    }
  }

  private aggiornaOrariDisponibili(selectedDate: string) {
    this.orariDisponibili = this.logicSrv.generaOrariDisponibili(9, 18, selectedDate);
    const oraAttuale = this.bookingForm.get('ora')?.value;
    if (oraAttuale && !this.orariDisponibili.includes(oraAttuale)) {
      this.bookingForm.patchValue({ ora: '' });
    }
  }

  private aggiornaOrariRiconsegna(selectedDate: string) {
    this.orariRiconsegna = this.logicSrv.generaOrariDisponibili(9, 18, selectedDate);
    const oraAttuale = this.bookingForm.get('oraRiconsegna')?.value;
    if (oraAttuale && !this.orariRiconsegna.includes(oraAttuale)) {
      this.bookingForm.patchValue({ oraRiconsegna: '' });
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

  /**
   * Calcola le mezze-giornate di noleggio allineandosi alla formula del backend:
   *   mezzeGiornate = ceil(diffOre / 6)
   * Usa gli orari effettivi (ora ritiro = START fascia, ora riconsegna = END fascia)
   * così da dare una stima accurata già nel form.
   */
  private getMezzeGiornate(): number {
    const dataRitiro    = this.bookingForm.get('data')?.value;
    const dataRiconsegna = this.bookingForm.get('dataRiconsegna')?.value;
    if (!dataRitiro || !dataRiconsegna) return 0;

    const oraRitiroFascia     = this.bookingForm.get('ora')?.value;
    const oraRiconsegnaFascia = this.bookingForm.get('oraRiconsegna')?.value;

    const inizio = new Date(dataRitiro);
    const fine   = new Date(dataRiconsegna);

    if (oraRitiroFascia) {
      // Ora di INIZIO del ritiro (es. "09:00 - 10:00" → 09:00)
      const { ore, minuti } = this.logicSrv.estraiOreMinuti(
        this.logicSrv.estraiOraInizioDaFascia(oraRitiroFascia)
      );
      inizio.setHours(ore, minuti, 0, 0);
    }

    if (oraRiconsegnaFascia) {
      // Ora di FINE della riconsegna (es. "17:00 - 18:00" → 18:00, che il backend salva)
      const { ore, minuti } = this.logicSrv.estraiOreMinuti(
        this.logicSrv.estraiOraFineDaFascia(oraRiconsegnaFascia)
      );
      fine.setHours(ore, minuti, 0, 0);
    }

    if (isNaN(inizio.getTime()) || isNaN(fine.getTime()) || fine <= inizio) return 0;

    const diffOre = (fine.getTime() - inizio.getTime()) / (1000 * 60 * 60);
    return Math.ceil(diffOre / 6);
  }
}