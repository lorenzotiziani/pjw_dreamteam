import { Component, inject, Input, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, firstValueFrom, takeUntil, combineLatest, of } from 'rxjs';
import { map, switchMap, startWith, tap } from 'rxjs/operators';
import { PuntoVenditaService } from '../../../services/punto-vendita.service';
import { PrenotazioneService } from '../../../services/prenotazione.service';
import { AccessorioService } from '../../../services/accessorio.service';
import { BikeService } from '../../../services/bike.service';
import { CoperturaService } from '../../../services/copertura.service';
import { LogicaService } from '../../../services/logica.service';

@Component({
  selector: 'app-edit-booking',
  standalone: false,
  templateUrl: './edit-booking.component.html'
})
export class EditBookingComponent implements OnInit, OnDestroy {
  @Input() prenotazioneId!: number;

  private fb = inject(FormBuilder);
  private modal = inject(NgbActiveModal);
  private prenotazioniSrv = inject(PrenotazioneService);
  private puntiVenditaSrv = inject(PuntoVenditaService);
  private bikeSrv = inject(BikeService);
  private accessorioSrv = inject(AccessorioService);
  private coperturaSrv = inject(CoperturaService);
  private logicSrv = inject(LogicaService);

  private destroy$ = new Subject<void>();

  FormControl = FormControl;
  isLoading = true;
  errorMessage = '';

  orariDisponibili: string[] = [];
  orariRiconsegna: string[] = [];

  puntiVendita$ = this.puntiVenditaSrv.puntoVendita$;
  coperture$ = this.coperturaSrv.coperture$;
  accessori$ = this.accessorioSrv.accessorio$;

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
    tap(id => console.log('puntoVenditaId cambiato:', id)),
    switchMap(puntoVenditaId => {
      const id = puntoVenditaId;
      if (!id) return of([]);
      return this.puntiVenditaSrv.stock(id).pipe(
        tap(stock => console.log('Stock ricevuto:', stock)),
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

  listaAccessori: any[] = [];

  async ngOnInit() {
    this.orariDisponibili = this.logicSrv.generaOrariDisponibili();
    this.setupOrariRiconsegnaListener();
    await this.caricaAccessoriPerCheckbox();
    await this.caricaPrenotazione();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupOrariRiconsegnaListener() {
    this.updateForm.get('oraRitiro')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(oraRitiro => {
        if (!oraRitiro) return;
        this.orariRiconsegna = this.logicSrv.generaOrariRiconsegna(oraRitiro);
        const current = this.updateForm.get('oraRiconsegna')?.value;
        if (current && !this.orariRiconsegna.includes(current)) {
          this.updateForm.patchValue({ oraRiconsegna: '' });
        }
      });
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

      const oraTime = this.logicSrv.extractTimeFromISO(pren.oraRitiro);
      const oraRitiroFascia = this.logicSrv.formatOraInFasciaFromTime(oraTime);
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

      // Forza l'aggiornamento del controllo punto vendita per attivare il filtro
      this.updateForm.get('puntoVenditaId')?.updateValueAndValidity();

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

  getTotale(): number {
    // Calcolo totale: prezzo bici + copertura + accessori
    const form = this.updateForm.value;
    const tipoBiciId = form.tipoBiciId;
    let totale = 0;
    // Puoi implementare la logica di calcolo usando i dati correnti
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
      accessoriPayload
    };

    this.modal.close(updated);
  }
  
  dismiss() {
    this.modal.dismiss();
  }
}