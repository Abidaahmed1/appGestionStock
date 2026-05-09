import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Fournisseur, Stock, Bon, MouvementStock, TypeBon, TypeMouvement, BonCommandeFournisseur, LigneCommande, TypeStock } from '../models/logistique.models';

@Injectable({
    providedIn: 'root'
})
export class LogistiqueService {
    private baseUrl = 'http://localhost:8095/api';
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

    deleteFournisseurPermanently(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/fournisseurs/${id}/permanent`);
    }


    getAllStocks(): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/pieces`);
    }

    // Deprecated: stocks are now pieces
    getStocksByType(type: any): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/pieces`);
    }


    getStocksByPiece(pieceId: number): Observable<Stock[]> {
        return this.http.get<Stock[]>(`${this.baseUrl}/stocks/piece/${pieceId}`);
    }

    getLowStockItems(): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/pieces/low-stock`);
    }

    createStock(stock: Stock): Observable<Stock> {
        return this.http.post<Stock>(`${this.baseUrl}/stocks`, stock);
    }

    updateStock(id: number, stock: Stock): Observable<Stock> {
        return this.http.put<Stock>(`${this.baseUrl}/stocks/${id}`, stock);
    }

    updateStockQuantity(id: number, quantity: number): Observable<any> {
        return this.http.patch<any>(`${this.baseUrl}/pieces/${id}/quantity?quantity=${quantity}`, {});
    }

    deleteStock(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/stocks/${id}`);
    }


    getAllBons(): Observable<Bon[]> {
        return this.http.get<Bon[]>(`${this.baseUrl}/bons`);
    }

    getBonsHistory(): Observable<Bon[]> {
        return this.http.get<Bon[]>(`${this.baseUrl}/bons/history`);
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

    reactivateBon(id: number): Observable<Bon> {
        return this.http.patch<Bon>(`${this.baseUrl}/bons/${id}/reactivate`, {});
    }

    deleteBonPermanently(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/bons/${id}/permanent`);
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

    getAllCommandesFournisseursForStats(): Observable<BonCommandeFournisseur[]> {
        return this.http.get<BonCommandeFournisseur[]>(`${this.baseUrl}/commandes-fournisseurs/stats`);
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

    deleteCommandePermanently(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/commandes-fournisseurs/${id}/permanent`);
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

    getPieceFournisseursByPieces(pieceIds: number[]): Observable<any[]> {
        const params = new HttpParams().set('ids', pieceIds.join(','));
        return this.http.get<any[]>(`${this.baseUrl}/piece-fournisseur/pieces`, { params });
    }

    savePieceFournisseur(pieceFournisseur: any): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/piece-fournisseur`, pieceFournisseur);
    }

    deletePieceFournisseur(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/piece-fournisseur/${id}`);
    }
}
