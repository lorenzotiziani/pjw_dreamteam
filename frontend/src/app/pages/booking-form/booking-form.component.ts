import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CategoriaBici, Taglia, TipoBici } from '../../entities/Bike';
import { BIKES_MOCK_SIZE, BIKES_MOCK_TYPE, COPERTURE_MOCK, PUNTI_VENDITA_MOCK } from '../../entities/mock';
import { BikeService } from '../../services/bike.service';
import { CoperturaService } from '../../services/copertura.service';
import { PuntoVenditaService } from '../../services/punto-vendita.service';
import { PuntoVendita } from '../../entities/puntoVendita';
import { Copertura } from '../../entities/Copertura';
import { Data, Router } from '@angular/router';
import { Accessorio } from '../../entities/Accessorio';
import { combineLatest, map, of, pipe, startWith, Subject, switchMap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { PrenotazioneService } from '../../services/prenotazione.service';
import { AccessorioService } from '../../services/accessorio.service';

@Component({
  selector: 'app-booking-form',
  standalone: false,
  templateUrl: './booking-form.component.html',
  styleUrl: './booking-form.component.css',
})
export class BookingFormComponent implements OnInit{
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

  orariDisponibili: string[] = [];
  orariRiconsegna: string[] = []; 
  copertureSelezionate: Copertura[] = [];
  accessoriSelezionati: Accessorio[] = [];

  puntoVendita$ = this.puntiVenditaSrv.puntoVendita$;
  accessori$ = this.accessorioSrv.accessorio$;
  coperture$ = this.coperturaSrv.coperture$;

  bookingForm = this.fb.group({
    data:                  ['', Validators.required],
    puntoVendita:          ['', Validators.required],
    ora:                   ['', Validators.required],
    oraRiconsegna:         ['', Validators.required],
    tipoBiciId:            ['', Validators.required],
    coperturaId:           ['']  // se non obbligatorio
    // coperture rimosso da qui – gestione manuale
  });

  coperturaSelezionata: Copertura | null = null;

  onCoperturaSelezionata(copertura: Copertura) {
    this.coperturaSelezionata = copertura;
    // Se vuoi salvare solo l'ID nel form:
    this.bookingForm.patchValue({ coperturaId: copertura.id });
  }

  // Observable che combina punto vendita + filtri, restituisce le bici disponibili (con stock)
  bikesDisponibili$ = combineLatest([
    this.bookingForm.get('puntoVendita')!.valueChanges.pipe(startWith(''))
  ]).pipe(
    switchMap(([puntoVenditaId]) => {
      if (!puntoVenditaId) return of([]);
      return this.puntiVenditaSrv.stock(puntoVenditaId).pipe(
        map(stockArray => {
          let bikesFromStock = stockArray.map(s => s.tipoBici);
          // Filtra per categoria e taglia
          return bikesFromStock.filter(bike => {
            const stockItem = stockArray.find(s => s.tipoBici.id === bike.id);
            const hasStock = stockItem ? stockItem.quantitaTotale > 0 : false;
            return hasStock;
          });
        })
      );
    })
  );


  ngOnInit() {
    this.generaOrari();
  }

  generaOrari(): void {
    for (let ora = 9; ora <= 18; ora++) {
      this.orariDisponibili.push(`${ora.toString().padStart(2, '0')}:00 - ${(ora+1).toString().padStart(2, '0')}:00`);
    }
  }

  // Gestione checkbox coperture
  onCoperturaChange(event: any, copertura: Copertura) {
    if (event.target.checked) {
      this.copertureSelezionate.push(copertura);
    } else {
      this.copertureSelezionate = this.copertureSelezionate.filter(c => c.id !== copertura.id);
    }
  }

  onAccessorioChange(event: any, accessorio: Accessorio) {
    if (event.target.checked) {
      this.accessoriSelezionati.push(accessorio);
    } else {
      this.copertureSelezionate = this.copertureSelezionate.filter(c => c.id !== accessorio.id);
    }
  }

  addPrenotazione() {

  }

  login(){
    this.router.navigate(['/login']) 
  }
}
