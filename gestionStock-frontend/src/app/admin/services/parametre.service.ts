import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export enum TypeChamp {
    TEXT = 'TEXT',
    NUMBER = 'NUMBER',
    BOOLEAN = 'BOOLEAN',
    DATE = 'DATE',
    SELECT = 'SELECT',
    EMAIL = 'EMAIL',
    URL = 'URL',
    TEXTAREA = 'TEXTAREA'
}

export interface ChampPersonnalise {
    nom: string;
    type: TypeChamp;
    obligatoire: boolean;
    variante: boolean;
    options: string[];
    defaultValue?: string;
    description?: string;
    ordre: number;
    actif: boolean;
    _showAddInput?: boolean;
}

export interface NumerotationConfig {
    module: string;
    prefix: string;
    numeroDebut: string;
    redemarrer: string;
    automatique?: boolean;
    actif: boolean;
}

export interface Parametre {
    id?: number;
    entreprise?: any;
    champsPersonnalises: ChampPersonnalise[];
    numerotationConfigs: NumerotationConfig[];
}

@Injectable({
    providedIn: 'root'
})
export class ParametreService {
    private apiUrl = 'http://localhost:8081/api/parametres';

    constructor(private http: HttpClient) { }

    getCurrentParametre(): Observable<Parametre> {
        return this.http.get<Parametre>(`${this.apiUrl}/current`);
    }

    getParametreByEntreprise(entrepriseId: number): Observable<Parametre> {
        return this.http.get<Parametre>(`${this.apiUrl}/entreprise/${entrepriseId}`);
    }

    ajouterChamp(parametreId: number, champ: ChampPersonnalise): Observable<Parametre> {
        return this.http.post<Parametre>(`${this.apiUrl}/${parametreId}/champs`, champ);
    }

    modifierChamp(parametreId: number, nomChamp: string, champ: ChampPersonnalise): Observable<Parametre> {
        return this.http.put<Parametre>(`${this.apiUrl}/${parametreId}/champs/${nomChamp}`, champ);
    }

    supprimerChamp(parametreId: number, nomChamp: string): Observable<Parametre> {
        return this.http.delete<Parametre>(`${this.apiUrl}/${parametreId}/champs/${nomChamp}`);
    }

    getTypesChamps(): Observable<TypeChamp[]> {
        return this.http.get<TypeChamp[]>(`${this.apiUrl}/types-champs`);
    }

    updateParametre(id: number, parametre: Parametre): Observable<Parametre> {
        return this.http.put<Parametre>(`${this.apiUrl}/${id}`, parametre);
    }

    getNumerotationConfigs(): Observable<NumerotationConfig[]> {
        return this.http.get<NumerotationConfig[]>(`${this.apiUrl}/numerotation`);
    }

    updateNumerotationConfigs(parametreId: number, configs: NumerotationConfig[]): Observable<Parametre> {
        return this.http.put<Parametre>(`${this.apiUrl}/${parametreId}/numerotation`, configs);
    }
}
