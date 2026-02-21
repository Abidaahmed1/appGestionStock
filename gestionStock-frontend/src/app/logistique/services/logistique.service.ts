import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Fournisseur, Stock, Bon, MouvementStock, TypeBon, TypeMouvement, BonCommandeFournisseur, LigneCommande, TypeStock } from '../models/logistique.models';

@Injectable({
    providedIn: 'root'
})
export class LogistiqueService {
    private baseUrl = 'http://localhost:8081/api';
    public commandeDraft: BonCommandeFournisseur | null = null;

    constructor(private http: HttpClient) { }


    getAllFournisseurs(): Observable<Fournisseur[]> {
        return this.http.get<Fournisseur[]>(`${this.baseUrl}/fournisseurs`);
    }

    getFournisseurById(id: number): Observable<Fournisseur> {
        return this.http.get<Fournisseur>(`${this.baseUrl}/fournisseurs/${id}`);
    }

    createFournisseur(fournisseur: Fournisseur): Observable<Fournisseur> {
        return this.http.post<Fournisseur>(`${this.baseUrl}/fournisseurs`, fournisseur);
    }

    updateFournisseur(id: number, fournisseur: Fournisseur): Observable<Fournisseur> {
        return this.http.put<Fournisseur>(`${this.baseUrl}/fournisseurs/${id}`, fournisseur);
    }

    deleteFournisseur(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/fournisseurs/${id}`);
    }


    getAllStocks(): Observable<Stock[]> {
        return this.http.get<Stock[]>(`${this.baseUrl}/stocks`);
    }

    getStocksByType(type: TypeStock): Observable<Stock[]> {
        return this.http.get<Stock[]>(`${this.baseUrl}/stocks/type/${type}`);
    }


    getStocksByPiece(pieceId: number): Observable<Stock[]> {
        return this.http.get<Stock[]>(`${this.baseUrl}/stocks/piece/${pieceId}`);
    }

    getLowStockItems(): Observable<Stock[]> {
        return this.http.get<Stock[]>(`${this.baseUrl}/stocks/low-stock`);
    }

    createStock(stock: Stock): Observable<Stock> {
        return this.http.post<Stock>(`${this.baseUrl}/stocks`, stock);
    }

    updateStock(id: number, stock: Stock): Observable<Stock> {
        return this.http.put<Stock>(`${this.baseUrl}/stocks/${id}`, stock);
    }

    updateStockQuantity(id: number, quantity: number): Observable<Stock> {
        const params = new HttpParams().set('quantity', quantity.toString());
        return this.http.patch<Stock>(`${this.baseUrl}/stocks/${id}/quantity`, null, { params });
    }

    deleteStock(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/stocks/${id}`);
    }


    getAllBons(): Observable<Bon[]> {
        return this.http.get<Bon[]>(`${this.baseUrl}/bons`);
    }

    getBonById(id: number): Observable<Bon> {
        return this.http.get<Bon>(`${this.baseUrl}/bons/${id}`);
    }

    getBonsByType(typeBon: TypeBon): Observable<Bon[]> {
        return this.http.get<Bon[]>(`${this.baseUrl}/bons/type/${typeBon}`);
    }

    getBonsByDateRange(startDate: string, endDate: string): Observable<Bon[]> {
        const params = new HttpParams()
            .set('startDate', startDate)
            .set('endDate', endDate);
        return this.http.get<Bon[]>(`${this.baseUrl}/bons/date-range`, { params });
    }

    createBon(bon: Bon): Observable<Bon> {
        return this.http.post<Bon>(`${this.baseUrl}/bons`, bon);
    }

    updateBon(id: number, bon: Bon): Observable<Bon> {
        return this.http.put<Bon>(`${this.baseUrl}/bons/${id}`, bon);
    }

    deleteBon(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/bons/${id}`);
    }


    getAllMouvements(): Observable<MouvementStock[]> {
        return this.http.get<MouvementStock[]>(`${this.baseUrl}/mouvements`);
    }

    getMouvementById(id: number): Observable<MouvementStock> {
        return this.http.get<MouvementStock>(`${this.baseUrl}/mouvements/${id}`);
    }

    getMouvementsByType(typeMouvement: TypeMouvement): Observable<MouvementStock[]> {
        return this.http.get<MouvementStock[]>(`${this.baseUrl}/mouvements/type/${typeMouvement}`);
    }

    getMouvementsByDateRange(startDate: string, endDate: string): Observable<MouvementStock[]> {
        const params = new HttpParams()
            .set('startDate', startDate)
            .set('endDate', endDate);
        return this.http.get<MouvementStock[]>(`${this.baseUrl}/mouvements/date-range`, { params });
    }

    createMouvement(mouvement: MouvementStock): Observable<MouvementStock> {
        return this.http.post<MouvementStock>(`${this.baseUrl}/mouvements`, mouvement);
    }

    updateMouvement(id: number, mouvement: MouvementStock): Observable<MouvementStock> {
        return this.http.put<MouvementStock>(`${this.baseUrl}/mouvements/${id}`, mouvement);
    }

    deleteMouvement(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/mouvements/${id}`);
    }


    getAllCommandesFournisseurs(): Observable<BonCommandeFournisseur[]> {
        return this.http.get<BonCommandeFournisseur[]>(`${this.baseUrl}/commandes-fournisseurs`);
    }

    getCommandeFournisseurById(id: number): Observable<BonCommandeFournisseur> {
        return this.http.get<BonCommandeFournisseur>(`${this.baseUrl}/commandes-fournisseurs/${id}`);
    }

    createCommandeFournisseur(commande: BonCommandeFournisseur): Observable<BonCommandeFournisseur> {
        return this.http.post<BonCommandeFournisseur>(`${this.baseUrl}/commandes-fournisseurs`, commande);
    }

    updateCommandeFournisseur(id: number, commande: BonCommandeFournisseur): Observable<BonCommandeFournisseur> {
        return this.http.put<BonCommandeFournisseur>(`${this.baseUrl}/commandes-fournisseurs/${id}`, commande);
    }

    deleteCommandeFournisseur(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/commandes-fournisseurs/${id}`);
    }

    getLignesByCommande(commandeId: number): Observable<LigneCommande[]> {
        return this.http.get<LigneCommande[]>(`${this.baseUrl}/lignes-commandes/commande/${commandeId}`);
    }

    createLigneCommande(ligne: LigneCommande): Observable<LigneCommande> {
        return this.http.post<LigneCommande>(`${this.baseUrl}/lignes-commandes`, ligne);
    }

    deleteLigneCommande(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/lignes-commandes/${id}`);
    }

    getPieceFournisseursByFournisseur(fournisseurId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/piece-fournisseur/fournisseur/${fournisseurId}`);
    }

    savePieceFournisseur(pieceFournisseur: any): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/piece-fournisseur`, pieceFournisseur);
    }

    deletePieceFournisseur(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/piece-fournisseur/${id}`);
    }
}
