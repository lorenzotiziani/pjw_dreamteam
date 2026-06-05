import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Copertura } from '../entities/Copertura';
import { BehaviorSubject, map } from 'rxjs';
import { ApiResponse } from './response';

@Injectable({
  providedIn: 'root',
})
export class CoperturaService {
    protected http = inject(HttpClient);

    protected _coperture$ = new BehaviorSubject<Copertura[]>([]);

    coperture$ = this._coperture$.asObservable();

    constructor(){
      this.fetch()
    }
    
    fetch(){
      return this.http.get<ApiResponse<Copertura[]>>(`/api/coperture`)
      .pipe(map(response => response.data))
      .subscribe(copertura => this._coperture$.next(copertura));
    }
}
