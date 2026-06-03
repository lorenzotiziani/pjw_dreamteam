import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TipoBici } from '../entities/Bike';
import { PuntoVendita } from '../entities/puntoVendita';

@Injectable({
  providedIn: 'root',
})
export class PuntoVenditaService {
    protected http = inject(HttpClient);

    protected _puntoVendita$ = new BehaviorSubject<PuntoVendita[]>([]);

    puntoVendita$ = this._puntoVendita$.asObservable();

    constructor(){
      this.fetch()
    }
    
    fetch(){
      this.http.get<PuntoVendita[]>(`/api/punti-vendita`).subscribe(punti => this._puntoVendita$.next(punti));
    }
}
