import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest, firstValueFrom, map, of, startWith, Subject, switchMap, take, takeUntil } from 'rxjs';
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

@Component({
  selector: 'app-booking-form',
  standalone: false,
  templateUrl: './booking-form.component.html',
  styleUrls: ['./booking-form.component.css'],
})
export class BookingFormComponent implements OnInit, OnDestroy {
  protected fb = inject(FormBuilder);
  protected puntiVenditaSrv = inject(PuntoVenditaService);
  protected bikeSrv = inject(BikeService);
  protected coperturaSrv = inject(CoperturaService);
  protected authSrv = inject(AuthService);
  protected router = inject(Router);
  protected prenotazioneSrv = inject(PrenotazioneService);
  protected accessorioSrv = inject(AccessorioService);

  protected destroyed$ = new Subject<void>();

  user$ = this.authSrv.currentUser$;

  biciSelezionata: TipoBici | null = null;
  prezzoTotale = 0;

  orariDisponibili: string[] = [];
  orariRiconsegna: string[] = [];

  coperturaSelezionata: Copertura | null = null;
  accessoriSelezionati: Accessorio[] = [];

  puntoVendita$ = this.puntiVenditaSrv.puntoVendita$;
  accessori$ = this.accessorioSrv.accessorio$;
  coperture$ = this.coperturaSrv.coperture$;

  bookingForm = this.fb.group({
    data: ['', Validators.required],
    puntoVendita: ['', Validators.required],
    ora: ['', Validators.required],
    oraRiconsegna: ['', Validators.required],
    tipoBiciId: ['', Validators.required],
    coperturaId: ['']
  });

  // Observable delle bici disponibili (con stock)
  bikesDisponibili$ = combineLatest([
    this.bookingForm.get('puntoVendita')!.valueChanges.pipe(startWith(''))
  ]).pipe(
    switchMap(([puntoVenditaId]) => {
      if (!puntoVenditaId) return of([]);
      return this.puntiVenditaSrv.stock(puntoVenditaId).pipe(
        map(stockArray =>
          stockArray
            .map(s => ({
              ...s.tipoBici,
              id: String(s.tipoBici.id),                         // number → string
              prezzoMezzaGiornata: Number(s.tipoBici.prezzoMezzaGiornata) // string → number
            }))
            .filter(bike => {
              const stockItem = stockArray.find(s => String(s.tipoBici.id) === bike.id);
              return stockItem ? stockItem.quantitaTotale > 0 : false;
            })
        )
      );
    })
  );

  ngOnInit() {
    this.generaOrariDisponibili();
    this.setupOrariRiconsegnaListener();
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  // Genera orari di ritiro dalle 9 alle 18
  generaOrariDisponibili(): void {
    for (let ora = 9; ora <= 17; ora++) {
      this.orariDisponibili.push(`${ora.toString().padStart(2, '0')}:00 - ${(ora + 1).toString().padStart(2, '0')}:00`);
    }
  }

  // Ascolta i cambi dell'orario di ritiro e popola di conseguenza gli orari di riconsegna
  setupOrariRiconsegnaListener(): void {
    this.bookingForm.get('ora')?.valueChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe(oraRitiro => {
        if (!oraRitiro) {
          this.orariRiconsegna = [];
          return;
        }
        // Estrae l'ora di fine della fascia di ritiro (es. "09:00 - 10:00" -> "10:00")
        const fineRitiro = oraRitiro.split(' - ')[1];
        const oraFine = parseInt(fineRitiro.split(':')[0]);
        this.orariRiconsegna = [];
        for (let ora = oraFine; ora <= 17; ora++) {
          this.orariRiconsegna.push(`${ora.toString().padStart(2, '0')}:00 - ${(ora + 1).toString().padStart(2, '0')}:00`);
        }
        // Resetta il campo oraRiconsegna se il valore selezionato non è più valido
        const currentRiconsegna = this.bookingForm.get('oraRiconsegna')?.value;
        if (currentRiconsegna && !this.orariRiconsegna.includes(currentRiconsegna)) {
          this.bookingForm.patchValue({ oraRiconsegna: '' });
        }
      });
  }

  // Quando si seleziona una bici
  onBiciChange(tipoBiciId: string) {
    this.bikesDisponibili$.pipe(take(1)).subscribe(bikes => {
      this.biciSelezionata = bikes.find(b => b.id === tipoBiciId) || null;
      this.calcolaTotale();
    });
  }

  // Quando si seleziona/deseleziona un accessorio
  onAccessorioChange(event: any, accessorio: Accessorio) {
    if (event.target.checked) {
      this.accessoriSelezionati.push(accessorio);
    } else {
      this.accessoriSelezionati = this.accessoriSelezionati.filter(a => a.id !== accessorio.id);
    }
    this.calcolaTotale();
  }

  // Quando si seleziona una copertura (radio button)
  onCoperturaSelezionata(copertura: Copertura) {
    this.coperturaSelezionata = copertura;
    this.bookingForm.patchValue({ coperturaId: copertura.id });
    this.calcolaTotale();
  }

  calcolaTotale() {
    let totale = Number(this.biciSelezionata?.prezzoMezzaGiornata || 0);
    if (this.coperturaSelezionata) {
      totale += Number(this.coperturaSelezionata.prezzo);
    }
    for (const acc of this.accessoriSelezionati) {
      totale += Number(acc.prezzo);
    }
    this.prezzoTotale = totale;
  }

async addPrenotazione() {
  if (this.bookingForm.invalid) {
    console.warn('Form invalido');
    return;
  }

  const user = await firstValueFrom(this.user$);
  if (!user || !user.id) {
    console.error('Utente non autenticato o ID mancante');
    return;
  }

  const formValue = this.bookingForm.value;

  // Data ritiro
  const dataRitiroStr = formValue.data; // è già in formato YYYY-MM-DD
  if (!dataRitiroStr) {
    console.error('Data ritiro mancante');
    return;
  }

  // Ora ritiro (es. "09:00 - 10:00" -> "09:00:00")
  const oraFasciaRitiro = formValue.ora;
  if (!oraFasciaRitiro) {
    console.error('Orario ritiro mancante');
    return;
  }
  const oraInizioRitiro = oraFasciaRitiro.split(' - ')[0];
  const oraRitiroStr = `${oraInizioRitiro}:00`;

  // Ora riconsegna
  const oraFasciaRiconsegna = formValue.oraRiconsegna;
  if (!oraFasciaRiconsegna) {
    console.error('Orario riconsegna mancante');
    return;
  }
  const oraInizioRiconsegna = oraFasciaRiconsegna.split(' - ')[0];
  const dataOraRiconsegna = new Date(dataRitiroStr);
  const [ore, minuti] = oraInizioRiconsegna.split(':').map(Number);
  dataOraRiconsegna.setHours(ore, minuti, 0, 0);
  const dataOraRiconsegnaStr = dataOraRiconsegna.toISOString();

  const dataRitiroDate = new Date(formValue.data!);  // "2026-06-14" → Date
  const dataOraRiconsegnaDate = new Date(dataOraRiconsegnaStr); // stringa ISO → Date

  // ID numerici
  const utenteIdNum = Number(user.id);
  const puntoVenditaIdNum = Number(formValue.puntoVendita);
  const tipoBiciIdNum = Number(formValue.tipoBiciId);
  const coperturaIdNum = this.coperturaSelezionata?.id ? Number(this.coperturaSelezionata.id) : null;

  // Accessori
  const accessoriPayload = this.accessoriSelezionati.map(acc => ({
    accessorioId: Number(acc.id),
    quantita: 1
  }));

  const totale = Number(this.prezzoTotale);
  if (isNaN(totale)) {
    console.error('Totale non valido');
    return;
  }

  // Verifica che nessun ID sia NaN
  if (isNaN(utenteIdNum) || isNaN(puntoVenditaIdNum) || isNaN(tipoBiciIdNum)) {
    console.error('Uno o più ID non sono numeri validi');
    return;
  }

  // Chiamata al service
  this.prenotazioneSrv.add(
    utenteIdNum,
    dataRitiroDate,
    puntoVenditaIdNum,
    oraRitiroStr,
    dataOraRiconsegnaDate,
    totale,
    StatoPrenotazione.CONFERMATA,
    tipoBiciIdNum,
    coperturaIdNum,
    accessoriPayload
  ).subscribe({
    next: (res) => {
      console.log('Prenotazione creata', res);
      this.router.navigate(['/booking/list']);
    },
    error: (err) => {
      console.error('Errore dettagliato:', err);
      if (err.error?.details) console.error('Details:', err.error.details);
    }
  });
}
  login() {
    this.router.navigate(['/login']);
  }
}