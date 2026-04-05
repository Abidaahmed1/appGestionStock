import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Inventaire } from '../models/inventaire.models';

export interface LigneAffectation {
    pieceId: number;
    responsableId: string;
}

export interface CreateInventaireRequest {
    nom: string;
    date?: Date;
    type: string;
    affectations: LigneAffectation[];
}

@Injectable({
    providedIn: 'root'
})
export class InventaireService {
    private baseUrl = 'http://localhost:8081/api/inventaires';

    constructor(private http: HttpClient) { }

    getAll(): Observable<Inventaire[]> {
        return this.http.get<Inventaire[]>(this.baseUrl);
    }

    getById(id: number): Observable<Inventaire> {
        return this.http.get<Inventaire>(`${this.baseUrl}/${id}`);
    }

    create(inventaire: Partial<Inventaire>): Observable<Inventaire> {
        return this.http.post<Inventaire>(this.baseUrl, inventaire);
    }

    /** Creates an inventory with optional piece selection */
    createFromRequest(req: CreateInventaireRequest): Observable<Inventaire> {
        return this.http.post<Inventaire>(`${this.baseUrl}/from-request`, req);
    }

    /** Gets all pieces available to be included in an inventory */
    getPiecesDisponibles(): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/pieces-disponibles`);
    }

    update(id: number, inventaire: Inventaire): Observable<Inventaire> {
        return this.http.put<Inventaire>(`${this.baseUrl}/${id}`, inventaire);
    }

    valider(id: number): Observable<Inventaire> {
        return this.http.post<Inventaire>(`${this.baseUrl}/${id}/valider`, {});
    }

    refuser(id: number, commentaire: string): Observable<Inventaire> {
        return this.http.post<Inventaire>(`${this.baseUrl}/${id}/refuser`, { commentaire });
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    demanderRecomptage(id: number, ligneId: number, motif?: string): Observable<Inventaire> {
        return this.http.post<Inventaire>(`${this.baseUrl}/${id}/lignes/${ligneId}/recompter`, { motif });
    }

    validerLigne(id: number, ligneId: number): Observable<Inventaire> {
        return this.http.post<Inventaire>(`${this.baseUrl}/${id}/lignes/${ligneId}/valider`, {});
    }

    refuserLigne(id: number, ligneId: number): Observable<Inventaire> {
        return this.http.post<Inventaire>(`${this.baseUrl}/${id}/lignes/${ligneId}/refuse`, {});
    }

    corrigerLigneManuellement(id: number, ligneId: number, nouveauStock: number): Observable<Inventaire> {
        return this.http.post<Inventaire>(`${this.baseUrl}/${id}/lignes/${ligneId}/corriger?nouveauStock=${nouveauStock}`, {});
    }
}
