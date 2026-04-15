import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PieceDetachee, ProduitFini, Categorie, Parametre, Unite } from '../models/magasinier.models';

@Injectable({
    providedIn: 'root'
})
export class MagasinierService {
    private baseUrl = 'http://localhost:8095/api';

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

    getPieceByReference(ref: string): Observable<PieceDetachee> {
        return this.http.get<PieceDetachee>(`${this.baseUrl}/pieces/reference/${ref}`);
    }

    deletePiece(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/pieces/${id}`);
    }

    deletePiecePermanently(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/pieces/${id}/permanent`);
    }
 
    updatePieceQuantity(id: number, quantity: number): Observable<PieceDetachee> {
        return this.http.patch<PieceDetachee>(`${this.baseUrl}/pieces/${id}/quantity?quantity=${quantity}`, {});
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

    deleteProduitPermanently(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/produits/${id}/permanent`);
    }

    uploadPieceImage(id: number, formData: FormData): Observable<PieceDetachee> {
        return this.http.post<PieceDetachee>(`${this.baseUrl}/pieces/upload-image/${id}`, formData);
    }

    deletePieceImage(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/pieces/delete-image/${id}`);
    }

    uploadProduitImage(id: number, formData: FormData): Observable<ProduitFini> {
        return this.http.post<ProduitFini>(`${this.baseUrl}/produits/upload-image/${id}`, formData);
    }

    deleteProduitImage(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/produits/delete-image/${id}`);
    }


    getCategories(): Observable<Categorie[]> {
        return this.http.get<Categorie[]>(`${this.baseUrl}/categories`);
    }

    createCategorie(categorie: Categorie): Observable<Categorie> {
        return this.http.post<Categorie>(`${this.baseUrl}/categories`, categorie);
    }



    getAllParametres(): Observable<Parametre[]> {
        return this.http.get<Parametre[]>(`${this.baseUrl}/parametres`);
    }

    updateParametre(id: number, parametre: Parametre): Observable<Parametre> {
        return this.http.put<Parametre>(`${this.baseUrl}/parametres/${id}`, parametre);
    }

    getUnites(): Observable<Unite[]> {
        return this.http.get<Unite[]>(`${this.baseUrl}/unites`);
    }

    // Archived Items
    getArchivedPieces(): Observable<PieceDetachee[]> {
        return this.http.get<PieceDetachee[]>(`${this.baseUrl}/pieces/archived`);
    }

    restorePiece(id: number): Observable<PieceDetachee> {
        return this.http.put<PieceDetachee>(`${this.baseUrl}/pieces/${id}/restore`, {});
    }

    getArchivedProduits(): Observable<ProduitFini[]> {
        return this.http.get<ProduitFini[]>(`${this.baseUrl}/produits/archived`);
    }

    restoreProduit(id: number): Observable<ProduitFini> {
        return this.http.put<ProduitFini>(`${this.baseUrl}/produits/${id}/restore`, {});
    }
}
