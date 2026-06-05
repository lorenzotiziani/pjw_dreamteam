import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { TipoBici } from '../entities/Bike';
import { PuntoVendita, Stock } from '../entities/puntoVendita';
import { ApiResponse } from './response';

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
    
    fetch() {
      return this.http.get<ApiResponse<PuntoVendita[]>>(`/api/punti-vendita`)
      .pipe(map(response => response.data))
      .subscribe(punti => this._puntoVendita$.next(punti));
    }

    stock(id: string){
      return this.http.get<ApiResponse<Stock[]>>(`/api/punti-vendita/${id}/stock`)
      .pipe(map(response => response.data));
    }
}
