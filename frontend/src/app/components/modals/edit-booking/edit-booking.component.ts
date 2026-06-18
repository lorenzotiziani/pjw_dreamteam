import { Component, inject, Input, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, firstValueFrom, takeUntil, of } from 'rxjs';
import { map, switchMap, startWith } from 'rxjs/operators';
import { PuntoVenditaService } from '../../../services/punto-vendita.service';
import { PrenotazioneService } from '../../../services/prenotazione.service';
import { AccessorioService } from '../../../services/accessorio.service';
import { BikeService } from '../../../services/bike.service';
import { CoperturaService } from '../../../services/copertura.service';
import { LogicaService } from '../../../services/logica.service';

@Component({
  selector: 'app-edit-booking',
  standalone: false,
  templateUrl: './edit-booking.component.html',
  styleUrl: './edit-booking.component.css'
})
export class EditBookingComponent implements OnInit, OnDestroy {
  @Input() prenotazioneId!: number;

  protected fb = inject(FormBuilder);
  protected modal = inject(NgbActiveModal);
  protected prenotazioniSrv = inject(PrenotazioneService);
  protected puntiVenditaSrv = inject(PuntoVenditaService);
  protected accessorioSrv = inject(AccessorioService);
  protected coperturaSrv = inject(CoperturaService);
  protected logicSrv = inject(LogicaService);

  protected destroy$ = new Subject<void>();

  FormControl = FormControl;
  isLoading = true;
  errorMessage = '';

  orariDisponibili: string[] = [];
  orariRiconsegna: string[] = []; // Ora popolato con tutti gli orari
  minDate: string = new Date().toISOString().split('T')[0];

  puntiVendita$ = this.puntiVenditaSrv.puntoVendita$;
  coperture$ = this.coperturaSrv.coperture$;
  accessori$ = this.accessorioSrv.accessorio$;

  // Liste locali per il calcolo del totale
  bikesDisponibiliList: any[] = [];
  copertureList: any[] = [];

  // Numero di bici della prenotazione (= numero di righe).
  // In modifica non è editabile, ma serve a moltiplicare totale/copertura/accessori.
  numeroBici = 1;

  updateForm = this.fb.group({
    dataRitiro: ['', Validators.required],
    dataRiconsegna: ['', Validators.required],
    puntoVenditaId: ['', Validators.required],
    oraRitiro: ['', Validators.required],
    oraRiconsegna: ['', Validators.required],
    tipoBiciId: ['', Validators.required],
    coperturaId: [''],
    accessori: this.fb.array([])
  });

  bikesDisponibili$ = this.updateForm.get('puntoVenditaId')!.valueChanges.pipe(
    startWith(''),
    switchMap(puntoVenditaId => {
      const id = puntoVenditaId;
      if (!id) return of([]);
      return this.puntiVenditaSrv.stock(id).pipe(
        map(stockArray =>
          stockArray.map(s => ({
            ...s.tipoBici,
            id: String(s.tipoBici.id),
            prezzoMezzaGiornata: Number(s.tipoBici.prezzoMezzaGiornata)
          }))
        )
      );
    })
  );

  get accessoriArray(): FormArray {
    return this.updateForm.get('accessori') as FormArray;
  }

  getAccessorioControl(i: number): FormControl {
  return this.accessoriArray.controls[i] as FormControl;
}

  listaAccessori: any[] = [];

  async ngOnInit() {
    // Inizializza entrambi gli array con tutti gli orari disponibili
    this.orariDisponibili = this.logicSrv.generaOrariDisponibili();
    this.orariRiconsegna = [...this.orariDisponibili]; // Mostra tutte le ore, nessun filtro

    // Stessa logica del form di prenotazione: se la data è oggi, escludi le fasce
    // già passate (e azzera la selezione se non è più valida).
    this.updateForm.get('dataRitiro')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.aggiornaOrariDisponibili(data ?? ''));
    this.updateForm.get('dataRiconsegna')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.aggiornaOrariRiconsegna(data ?? ''));

    // Sottoscrizioni per tenere aggiornate le liste locali
    this.bikesDisponibili$
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => this.bikesDisponibiliList = list);

    this.coperture$
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => this.copertureList = list);

    await this.caricaAccessoriPerCheckbox();
    await this.caricaPrenotazione();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Rigenera le fasce di ritiro in base alla data (oggi → esclude le ore passate). */
  private aggiornaOrariDisponibili(selectedDate: string) {
    this.orariDisponibili = this.logicSrv.generaOrariDisponibili(9, 18, selectedDate);
    const oraAttuale = this.updateForm.get('oraRitiro')?.value;
    if (oraAttuale && !this.orariDisponibili.includes(oraAttuale)) {
      this.updateForm.patchValue({ oraRitiro: '' });
    }
  }

  /** Rigenera le fasce di riconsegna in base alla data (oggi → esclude le ore passate). */
  private aggiornaOrariRiconsegna(selectedDate: string) {
    this.orariRiconsegna = this.logicSrv.generaOrariDisponibili(9, 18, selectedDate);
    const oraAttuale = this.updateForm.get('oraRiconsegna')?.value;
    if (oraAttuale && !this.orariRiconsegna.includes(oraAttuale)) {
      this.updateForm.patchValue({ oraRiconsegna: '' });
    }
  }

  async caricaPrenotazione() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const response = await firstValueFrom(this.prenotazioniSrv.getById(this.prenotazioneId));
      if (!response?.success || !response.data) throw new Error('Prenotazione non trovata');
      const pren = response.data;

      const dataRitiro = pren.dataRitiro?.split('T')[0] ?? '';
      const dataRiconsegna = pren.dataOraRiconsegna?.split('T')[0] ?? '';

      // Numero di bici = numero di righe della prenotazione (1 riga per bici).
      this.numeroBici = pren.righe?.length || 1;

      // Estrazione corretta dell'ora di ritiro dal formato ISO
      const oraTime = this.logicSrv.extractTimeFromISO(pren.oraRitiro);
      const oraRitiroFascia = this.logicSrv.formatOraInFasciaFromTime(oraTime);
      
      // Per la riconsegna: usiamo formatDateTimeToFascia come prima
      const oraRiconsegnaFascia = this.logicSrv.formatDateTimeToFascia(pren.dataOraRiconsegna);

      this.updateForm.patchValue({
        dataRitiro,
        dataRiconsegna,
        puntoVenditaId: pren.puntoVenditaId?.toString() ?? '',
        oraRitiro: oraRitiroFascia,
        oraRiconsegna: oraRiconsegnaFascia,
        tipoBiciId: pren.righe?.[0]?.tipoBiciId?.toString() ?? '',
        coperturaId: pren.righe?.[0]?.coperturaId?.toString() ?? ''
      });

      const accessoriIds = pren.righe?.[0]?.accessori?.map((a: any) => a.accessorioId) ?? [];
      this.selezionaAccessori(accessoriIds);
    } catch (err) {
      console.error(err);
      this.errorMessage = 'Impossibile caricare i dati della prenotazione.';
    } finally {
      this.isLoading = false;
    }
  }

  caricaAccessoriPerCheckbox(): Promise<void> {
    return new Promise((resolve) => {
      this.accessori$.pipe(takeUntil(this.destroy$)).subscribe(accessori => {
        this.listaAccessori = accessori;
        while (this.accessoriArray.length) this.accessoriArray.removeAt(0);
        accessori.forEach(() => this.accessoriArray.push(this.fb.control(false)));
        resolve();
      });
    });
  }

  selezionaAccessori(ids: number[]) {
    setTimeout(() => {
      this.listaAccessori.forEach((acc, idx) => {
        const isSelected = ids.includes(Number(acc.id));
        if (this.accessoriArray.controls[idx]) {
          this.accessoriArray.controls[idx].setValue(isSelected);
        }
      });
    }, 50);
  }

  /**
   * Mezze giornate = ceil(diffOre / 6), identico al backend.
   * Usa ora di INIZIO ritiro e ora di FINE riconsegna (fascia selezionata).
   */
  private getMezzeGiornate(): number {
    const dataRitiro      = this.updateForm.get('dataRitiro')?.value;
    const dataRiconsegna  = this.updateForm.get('dataRiconsegna')?.value;
    if (!dataRitiro || !dataRiconsegna) return 0;

    const oraRitiroFascia     = this.updateForm.get('oraRitiro')?.value;
    const oraRiconsegnaFascia = this.updateForm.get('oraRiconsegna')?.value;

    const inizio = new Date(dataRitiro);
    const fine   = new Date(dataRiconsegna);

    if (oraRitiroFascia) {
      const { ore, minuti } = this.logicSrv.estraiOreMinuti(
        this.logicSrv.estraiOraInizioDaFascia(oraRitiroFascia)
      );
      inizio.setHours(ore, minuti, 0, 0);
    }

    if (oraRiconsegnaFascia) {
      const { ore, minuti } = this.logicSrv.estraiOreMinuti(
        this.logicSrv.estraiOraFineDaFascia(oraRiconsegnaFascia)
      );
      fine.setHours(ore, minuti, 0, 0);
    }

    if (isNaN(inizio.getTime()) || isNaN(fine.getTime()) || fine <= inizio) return 0;
    return Math.ceil((fine.getTime() - inizio.getTime()) / (1000 * 60 * 60 * 6));
  }

  getTotale(): number {
    const form = this.updateForm.value;
    const mezzeGiornate = this.getMezzeGiornate();
    const nBici = Math.max(this.numeroBici, 1);
    let totale = 0;

    // Bici: prezzoMezzaGiornata × mezzeGiornate × numeroBici
    if (form.tipoBiciId && this.bikesDisponibiliList.length) {
      const bici = this.bikesDisponibiliList.find(b => b.id == form.tipoBiciId);
      if (bici) totale += Number(bici.prezzoMezzaGiornata) * Math.max(mezzeGiornate, 1) * nBici;
    }

    // Copertura: costo fisso × numeroBici (non dipende dalla durata)
    if (form.coperturaId && this.copertureList.length) {
      const cop = this.copertureList.find(c => c.id == form.coperturaId);
      if (cop) totale += Number(cop.prezzo) * nBici;
    }

    // Accessori: costo fisso × numeroBici (non dipende dalla durata)
    this.accessoriArray.controls.forEach((ctrl, idx) => {
      if (ctrl.value && this.listaAccessori[idx]) {
        totale += Number(this.listaAccessori[idx].prezzo) * nBici;
      }
    });

    return totale;
  }

  confermaModifica() {
    if (this.updateForm.invalid) {
      this.updateForm.markAllAsTouched();
      return;
    }

    const form = this.updateForm.value;
    const dataRitiro = form.dataRitiro!;
    const dataRiconsegna = form.dataRiconsegna!;
    const oraRitiroTime = this.logicSrv.fasciaToOraTime(form.oraRitiro!);
    const dataOraRiconsegna = this.logicSrv.fasciaToDate(new Date(dataRiconsegna), form.oraRiconsegna!);
    const dataOraRiconsegnaStr = this.logicSrv.formatDateTimeToBackend(dataOraRiconsegna);

    const accessoriSelezionatiIds: number[] = [];
    this.accessoriArray.controls.forEach((ctrl, idx) => {
      if (ctrl.value && this.listaAccessori[idx]) {
        accessoriSelezionatiIds.push(Number(this.listaAccessori[idx].id));
      }
    });
    const accessoriPayload = accessoriSelezionatiIds.map(id => ({ accessorioId: id, quantita: 1 }));

    const updated = {
      dataRitiro,
      puntoVenditaId: Number(form.puntoVenditaId),
      oraRitiro: oraRitiroTime,
      dataOraRiconsegna: dataOraRiconsegnaStr,
      tipoBiciId: Number(form.tipoBiciId),
      coperturaId: form.coperturaId ? Number(form.coperturaId) : null,
      totale: this.getTotale(),
      accessoriPayload,
      // Numero di bici della prenotazione: va re-inviato per non perderle nell'update
      numeroBici: this.numeroBici
    };

    this.modal.close(updated);
  }

  dismiss() {
    this.updateForm.reset();
    this.updateForm.markAsPristine();
    this.modal.dismiss();
  }
}