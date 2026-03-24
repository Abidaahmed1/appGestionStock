import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Parametre, NumerotationConfig, TypeChamp } from '../../shared/models/parametre.model';

export { TypeChamp };
export type { Parametre, NumerotationConfig };

@Injectable({
    providedIn: 'root'
})
export class ParametreService {
    private apiUrl = 'http://localhost:8081/api/parametres';

    constructor(private http: HttpClient) { }

    getParametres(): Observable<Parametre[]> {
        return this.http.get<Parametre[]>(this.apiUrl);
    }

    getCurrentParametres(): Observable<Parametre[]> {
        return this.http.get<Parametre[]>(`${this.apiUrl}/current`);
    }

    getMasterParametre(): Observable<Parametre> {
        return this.getCurrentParametres().pipe(
            map(params => {
                if (params && params.length > 0) {
                    return params[0];
                }
                throw new Error('Aucun paramètre trouvé pour cette entreprise.');
            })
        );
    }

    getParametresByEntreprise(entrepriseId: number): Observable<Parametre[]> {
        return this.http.get<Parametre[]>(`${this.apiUrl}/entreprise/${entrepriseId}`);
    }

    updateParametre(id: number, parametre: Parametre): Observable<Parametre> {
        return this.http.put<Parametre>(`${this.apiUrl}/${id}`, parametre);
    }

    updateParametresBulk(parametres: Parametre[]): Observable<Parametre[]> {
        return this.http.put<Parametre[]>(`${this.apiUrl}/bulk`, parametres);
    }

    getNumerotationConfigs(): Observable<NumerotationConfig[]> {
        return this.http.get<NumerotationConfig[]>(`${this.apiUrl}/numerotation`);
    }

    updateNumerotationConfigs(id: number, configs: NumerotationConfig[]): Observable<Parametre> {
        return this.http.put<Parametre>(`${this.apiUrl}/${id}/numerotation`, configs);
    }

    getTypesChamps(): Observable<any[]> {
        return of([
            { value: TypeChamp.TEXT, label: 'Texte court' },
            { value: TypeChamp.NUMBER, label: 'Nombre' },
            { value: TypeChamp.SELECT, label: 'Sélection (Dropdown)' },
            { value: TypeChamp.LISTE, label: 'Liste de valeurs' },
            { value: TypeChamp.BOOLEAN, label: 'Case à cocher' },
            { value: TypeChamp.TEXTAREA, label: 'Texte long' },
            { value: TypeChamp.EMAIL, label: 'Email' }
        ]);
    }
}
