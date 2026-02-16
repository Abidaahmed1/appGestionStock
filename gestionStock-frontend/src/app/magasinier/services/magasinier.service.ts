import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PieceDetachee, ProduitFini, Categorie } from '../models/magasinier.models';

@Injectable({
    providedIn: 'root'
})
export class MagasinierService {
    private baseUrl = 'http://localhost:8081/api';

    constructor(private http: HttpClient) { }

    getPieces(): Observable<PieceDetachee[]> {
        return this.http.get<PieceDetachee[]>(`${this.baseUrl}/pieces`);
    }

    createPiece(piece: PieceDetachee): Observable<PieceDetachee> {
        return this.http.post<PieceDetachee>(`${this.baseUrl}/pieces`, piece);
    }

    updatePiece(id: number, piece: PieceDetachee): Observable<PieceDetachee> {
        return this.http.put<PieceDetachee>(`${this.baseUrl}/pieces/${id}`, piece);
    }

    deletePiece(codeBarre: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/pieces/${codeBarre}`);
    }

    getProduits(): Observable<ProduitFini[]> {
        return this.http.get<ProduitFini[]>(`${this.baseUrl}/produits`);
    }

    createProduit(produit: ProduitFini): Observable<ProduitFini> {
        return this.http.post<ProduitFini>(`${this.baseUrl}/produits`, produit);
    }

    updateProduit(id: number, produit: ProduitFini): Observable<ProduitFini> {
        return this.http.put<ProduitFini>(`${this.baseUrl}/produits/${id}`, produit);
    }

    deleteProduit(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/produits/${id}`);
    }

    uploadPieceImage(id: number, formData: FormData): Observable<PieceDetachee> {
        return this.http.post<PieceDetachee>(`${this.baseUrl}/pieces/upload-image/${id}`, formData);
    }

    uploadProduitImage(id: number, formData: FormData): Observable<ProduitFini> {
        return this.http.post<ProduitFini>(`${this.baseUrl}/produits/upload-image/${id}`, formData);
    }


    getCategories(): Observable<Categorie[]> {
        return this.http.get<Categorie[]>(`${this.baseUrl}/categories`);
    }

    createCategorie(categorie: Categorie): Observable<Categorie> {
        return this.http.post<Categorie>(`${this.baseUrl}/categories`, categorie);
    }
}
