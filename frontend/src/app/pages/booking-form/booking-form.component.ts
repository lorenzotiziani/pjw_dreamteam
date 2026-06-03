import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CategoriaBici, Taglia } from '../../entities/Bike';
import { BIKES_MOCK_SIZE, BIKES_MOCK_TYPE, COPERTURE_MOCK, PUNTI_VENDITA_MOCK } from '../../entities/mock';
import { BikeService } from '../../services/bike.service';
import { CoperturaService } from '../../services/copertura.service';
import { PuntoVenditaService } from '../../services/punto-vendita.service';
import { PuntoVendita } from '../../entities/puntoVendita';
import { Copertura } from '../../entities/Copertura';
import { Data } from '@angular/router';
import { Accessorio } from '../../entities/Accessorio';

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

  orariDisponibili: string[] = [];

  types: CategoriaBici[] = BIKES_MOCK_TYPE;
  sizes: Taglia[] = BIKES_MOCK_SIZE;
  puntiVendita: PuntoVendita[] = PUNTI_VENDITA_MOCK;
  coperture: Copertura[] = COPERTURE_MOCK;

  bikes$ = this.bikeSrv.bikes$;
  coperture$ = this.coperturaSrv.coperture$;
  puntoVendita$ = this.puntiVenditaSrv.puntoVendita$;

  bookingForm = this.fb.group({
    data:                  ['', {validators: [Validators.required]}],
    puntoVendita:          ['', {validators: [Validators.required]}],
    ora:                   ['', {validators: [Validators.required]}],
    dataRiconsegna:        ['', {validators: [Validators.required]}],
    tipologiaBicicletta:   ['', {validators: [Validators.required]}],
    dimensioneBicicletta:  ['', {validators: [Validators.required]}],
    accessori:             ['', {validators: [Validators.required]}],
    coperture:             ['', {validators: [Validators.required]}]
  });

  ngOnInit(): void {
    this.SlotOrari();
  }

  SlotOrari(): void {
    for (let ora = 9; ora <= 18; ora++) {
      const orario = `${ora.toString().padStart(2, '0')}:00 - ${(ora + 1).toString().padStart(2, '0')}:00`;
      this.orariDisponibili.push(orario);
    }
  }

  addPrenotazione(data: Date, puntoVendita: string, ora: Date, dataRiconsegna: Date, tipologiaBicicletta: CategoriaBici, 
                  dimensioneBicicletta: Taglia, accessori: Accessorio[], coperture: Copertura[] ){
                    
  }
}
