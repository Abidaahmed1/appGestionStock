import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Entrepot } from '../models/logistique.models';

@Injectable({
    providedIn: 'root'
})
export class LogistiqueService {
    private baseUrl = 'http://localhost:8081/api/entrepots';

    constructor(private http: HttpClient) { }

    getAll(): Observable<Entrepot[]> {
        return this.http.get<Entrepot[]>(this.baseUrl);
    }

    create(entrepot: Entrepot): Observable<Entrepot> {
        return this.http.post<Entrepot>(this.baseUrl, entrepot);
    }

    update(id: number, entrepot: Entrepot): Observable<Entrepot> {
        return this.http.put<Entrepot>(`${this.baseUrl}/${id}`, entrepot);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
