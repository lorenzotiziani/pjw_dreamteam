import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CategoriaBici, TipoBici } from '../entities/Bike';
import { BehaviorSubject, map } from 'rxjs';
import { ApiResponse } from './response';

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
      return this.http.get<ApiResponse<TipoBici[]>>(`/api/tipi-bici`)
      .pipe(map(response => response.data))
      .subscribe(categorie => this._bikes$.next(categorie));
    }
}
