import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CategoriaBici, TipoBici } from '../entities/Bike';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BikeService {
    protected http = inject(HttpClient);

    protected _bikes$ = new BehaviorSubject<TipoBici[]>([]);

    bikes$ = this._bikes$.asObservable();

    constructor(){
      this.fetch()
    }
    
    fetch(){
      this.http.get<TipoBici[]>(`/api/tipi-bici`).subscribe(categorie => this._bikes$.next(categorie));
    }
}
