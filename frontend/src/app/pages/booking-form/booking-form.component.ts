import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
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
  protected bikeSrv = inject(BikeService);
  protected coperturaSrv = inject(CoperturaService);
  protected prenotazioneSrv = inject(PrenotazioneService);
  protected accessorioSrv = inject(AccessorioService);
  protected logicSrv = inject(LogicaService); 

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
    dataRiconsegna: ['', Validators.required], 
    puntoVendita: ['', Validators.required],
    ora: ['', Validators.required],
    oraRiconsegna: ['', Validators.required],
    tipoBiciId: ['', Validators.required],
    coperturaId: ['']
  });

  ngOnInit() {
    this.orariDisponibili = this.logicSrv.generaOrariDisponibili();
    this.setupOrariRiconsegnaListener();
    this.restoreFormState();
  }

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
              id: String(s.tipoBici.id),
              prezzoMezzaGiornata: Number(s.tipoBici.prezzoMezzaGiornata)
            }))
            .filter(bike => {
              const stockItem = stockArray.find(s => String(s.tipoBici.id) === bike.id);
              return stockItem ? stockItem.quantitaTotale > 0 : false;
            })
        )
      );
    })
  );


  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  setupOrariRiconsegnaListener(): void {
    this.bookingForm.get('ora')?.valueChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe(oraRitiro => {
        this.orariRiconsegna = this.logicSrv.generaOrariRiconsegna(oraRitiro!);
        const current = this.bookingForm.get('oraRiconsegna')?.value;
        if (current && !this.orariRiconsegna.includes(current)) {
          this.bookingForm.patchValue({ oraRiconsegna: '' });
        }
      });
  }

  onBiciChange(tipoBiciId: string) {
    this.bikesDisponibili$.pipe(takeUntil(this.destroyed$)).subscribe(bikes => {
      this.biciSelezionata = bikes.find(b => b.id === tipoBiciId) || null;
      this.calcolaTotale();
    });
  }

  onAccessorioChange(event: any, accessorio: Accessorio) {
    if (event.target.checked) {
      this.accessoriSelezionati.push(accessorio);
    } else {
      this.accessoriSelezionati = this.accessoriSelezionati.filter(a => a.id !== accessorio.id);
    }
    this.calcolaTotale();
  }

  onCoperturaSelezionata(copertura: Copertura) {
    this.coperturaSelezionata = copertura;
    this.bookingForm.patchValue({ coperturaId: copertura.id });
    this.calcolaTotale();
  }

  calcolaTotale() {
    const prezzoBici = Number(this.biciSelezionata?.prezzoMezzaGiornata || 0);
    const prezzoCopertura = Number(this.coperturaSelezionata?.prezzo || 0);
    const prezziAccessori = this.accessoriSelezionati.map(a => Number(a.prezzo));
    this.prezzoTotale = this.logicSrv.calcolaTotale(prezzoBici, prezzoCopertura, prezziAccessori);
  }

  async addPrenotazione() {
    if (this.bookingForm.invalid) return;

    const user = await firstValueFrom(this.user$);
    if (!user || !user.id) return;

    const form = this.bookingForm.value;

    // Data ritiro
    const dataRitiro = new Date(form.data!);
    const dataRiconsegna = new Date(form.dataRiconsegna!);
    // Orari
    const oraRitiroTime = this.logicSrv.fasciaToOraTime(form.ora!);
    const dataOraRiconsegna = this.logicSrv.fasciaToDate(dataRiconsegna, form.oraRiconsegna!);

    // ID numerici
    const utenteIdNum = Number(user.id);
    const puntoVenditaIdNum = Number(form.puntoVendita);
    const tipoBiciIdNum = Number(form.tipoBiciId);
    const coperturaIdNum = this.coperturaSelezionata?.id ? Number(this.coperturaSelezionata.id) : null;

    const accessoriPayload = this.accessoriSelezionati.map(acc => ({
      accessorioId: Number(acc.id),
      quantita: 1
    }));

    const totale = this.prezzoTotale;

    this.prenotazioneSrv.add(
      utenteIdNum,
      dataRitiro,
      puntoVenditaIdNum,
      oraRitiroTime,
      dataOraRiconsegna,
      totale,
      StatoPrenotazione.CONFERMATA,
      tipoBiciIdNum,
      coperturaIdNum,
      accessoriPayload
    ).subscribe({
      next: () => this.router.navigate(['/booking/list']),
      error: err => console.error(err)
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
        this.bookingForm.patchValue(formData);
        sessionStorage.removeItem(this.FORM_STORAGE_KEY);
      } catch (e) {
        console.error('Errore nel ripristino del form', e);
      }
    }
  }

onLoginClick() {
  this.saveFormState();  // salva i dati del form
  this.router.navigate(['/login'], { queryParams: { requestedUrl: '/booking/form' } });
}

onRegisterClick() {
  this.saveFormState();
  this.router.navigate(['/register'], { queryParams: { requestedUrl: '/booking/form' } });
}

}