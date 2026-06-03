import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Copertura } from '../entities/Copertura';
import { BehaviorSubject } from 'rxjs';

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
      this.http.get<Copertura[]>(`/api/coperture`).subscribe(copertura => this._coperture$.next(copertura));
    }
}
