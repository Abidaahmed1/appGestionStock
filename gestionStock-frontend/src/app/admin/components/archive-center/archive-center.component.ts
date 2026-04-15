import { Component, OnInit, ChangeDetectorRef, NgZone, PLATFORM_ID, Inject, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MagasinierService } from '../../../magasinier/services/magasinier.service';
import { PieceDetachee, ProduitFini } from '../../../magasinier/models/magasinier.models';
import { PieceFormComponent } from '../../../magasinier/components/piece-form/piece-form.component';
import { ProduitFormComponent } from '../../../magasinier/components/produit-form/produit-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';
import { LogistiqueService } from '../../../logistique/services/logistique.service';

@Component({
    selector: 'app-archive-center',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmDialogComponent, PieceFormComponent, ProduitFormComponent],
    templateUrl: './archive-center.component.html',
    styleUrl: './archive-center.component.css'
})
export class ArchiveCenterComponent implements OnInit {
    activeTab: 'pieces' | 'produits' | 'fournisseurs' | 'bons' = 'pieces';
    archivedPieces: PieceDetachee[] = [];
    archivedProduits: ProduitFini[] = [];
    archivedFournisseurs: any[] = [];
    archivedBons: any[] = [];
    archivedCommandes: any[] = [];

    pieceSearch: string = '';
    produitSearch: string = '';

    itemToRestore: any = null;
    restoreType: 'piece' | 'produit' | 'fournisseur' | 'bon' | 'commande' = 'piece';
    showRestoreConfirm: boolean = false;

    itemToDelete: any = null;
    deleteType: 'piece' | 'produit' | 'fournisseur' | 'bon' | 'commande' = 'piece';
    showDeleteConfirm: boolean = false;
    isStockWarning: boolean = false;

    // Modal Edit states
    showPieceEditModal = false;
    showProduitEditModal = false;
    selectedPiece: PieceDetachee | null = null;
    selectedProduit: ProduitFini | null = null;

    // Data feeds for forms
    parametres: any[] = [];
    categories: any[] = [];
    produitsFinis: any[] = [];
    activePieces: PieceDetachee[] = [];
    unites: any[] = [];
    entreprise: Entreprise | null = null;
    isSaving = false;

    notification: { message: string, type: 'success' | 'error' } | null = null;

    private entrepriseService = inject(EntrepriseService);
    private logistiqueService = inject(LogistiqueService);

    constructor(
        private magasinierService: MagasinierService,
        private router: Router,
        private cdr: ChangeDetectorRef,
        private ngZone: NgZone,
        @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    ngOnInit(): void {
        if (isPlatformBrowser(this.platformId)) {
            this.loadAllArchived();
            this.loadFormContext();
        }
    }

    loadFormContext() {
        this.magasinierService.getAllParametres().subscribe({
            next: (data) => {
                this.parametres = data || [];
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error loading parameters:', err)
        });

        this.magasinierService.getCategories().subscribe(data => this.categories = data || []);
        this.magasinierService.getUnites().subscribe(data => this.unites = data || []);
        this.magasinierService.getProduits().subscribe(data => this.produitsFinis = data || []);
        this.magasinierService.getPieces().subscribe(data => this.activePieces = data || []);
        this.entrepriseService.getCurrentEntreprise().subscribe(data => {
            this.entreprise = data;
            this.cdr.detectChanges();
        });
    }

    loadAllArchived(): void {
        this.loadArchivedPieces();
        this.loadArchivedProduits();
        this.loadArchivedFournisseurs();
        this.loadArchivedBons();
        this.loadArchivedCommandes();
    }

    loadArchivedPieces(): void {
        this.magasinierService.getArchivedPieces().subscribe({
            next: (data) => {
                this.archivedPieces = data || [];
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error fetching archived pieces:', err)
        });
    }

    loadArchivedProduits(): void {
        this.magasinierService.getArchivedProduits().subscribe({
            next: (data) => {
                this.archivedProduits = data || [];
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error fetching archived produits:', err)
        });
    }

    loadArchivedFournisseurs() {
        this.logistiqueService.getArchivedFournisseurs().subscribe((data: any[]) => {
            this.archivedFournisseurs = data || [];
            this.cdr.detectChanges();
        });
    }

    loadArchivedBons() {
        this.logistiqueService.getBonsHistory().subscribe((data: any[]) => {
            this.archivedBons = data || [];
            this.cdr.detectChanges();
        });
    }

    loadArchivedCommandes() {
        this.logistiqueService.getAllCommandesFournisseurs().subscribe((data) => {
            this.archivedCommandes = (data || []).filter((c: any) => c.archived);
            this.cdr.detectChanges();
        });
    }

    printBon(bon: any) {
        const type = bon.typeBon === 'ENTREE' ? 'BON_ENTREE' : (bon.typeBon === 'SORTIE' ? 'BON_SORTIE' : 'BON_RETOUR');
        this.router.navigate(['/document/preview', bon.id], { queryParams: { type } });
    }

    printCommande(commande: any) {
        this.router.navigate(['/document/preview', commande.id], { queryParams: { type: 'COMMANDE_FOURNISSEUR' } });
    }

    get filteredPieces(): PieceDetachee[] {
        if (!this.pieceSearch) return this.archivedPieces;
        const term = this.pieceSearch.toLowerCase();
        return this.archivedPieces.filter(p =>
            p.designation.toLowerCase().includes(term) ||
            p.reference.toLowerCase().includes(term)
        );
    }

    get filteredProduits(): ProduitFini[] {
        if (!this.produitSearch) return this.archivedProduits;
        const term = this.produitSearch.toLowerCase();
        return this.archivedProduits.filter(p =>
            p.designation.toLowerCase().includes(term) ||
            p.code.toLowerCase().includes(term)
        );
    }

    confirmRestorePiece(piece: PieceDetachee): void {
        this.itemToRestore = piece;
        this.restoreType = 'piece';
        this.showRestoreConfirm = true;
    }

    confirmRestoreProduit(prod: ProduitFini): void {
        this.itemToRestore = prod;
        this.restoreType = 'produit';
        this.showRestoreConfirm = true;
    }

    confirmDeletePiece(piece: PieceDetachee): void {
        this.itemToDelete = piece;
        this.deleteType = 'piece';
        this.isStockWarning = (piece.quantite || 0) > 0;
        this.showDeleteConfirm = true;
    }

    confirmDeleteProduit(prod: ProduitFini): void {
        this.itemToDelete = prod;
        this.deleteType = 'produit';
        this.isStockWarning = false;
        this.showDeleteConfirm = true;
    }

    confirmRestoreFournisseur(f: any) {
        this.itemToRestore = f;
        this.restoreType = 'fournisseur';
        this.showRestoreConfirm = true;
    }

    confirmRestoreBon(b: any) {
        this.itemToRestore = b;
        this.restoreType = 'bon';
        this.showRestoreConfirm = true;
    }

    confirmRestoreCommande(c: any) {
        this.itemToRestore = c;
        this.restoreType = 'commande';
        this.showRestoreConfirm = true;
    }

    confirmDeleteFournisseur(f: any) {
        this.itemToDelete = f;
        this.deleteType = 'fournisseur';
        this.showDeleteConfirm = true;
    }

    confirmDeleteBon(b: any) {
        this.itemToDelete = b;
        this.deleteType = 'bon';
        this.showDeleteConfirm = true;
    }

    confirmDeleteCommande(c: any) {
        this.itemToDelete = c;
        this.deleteType = 'commande';
        this.showDeleteConfirm = true;
    }

    openEditPiece(piece: PieceDetachee): void {
        this.selectedPiece = { ...piece };
        this.showPieceEditModal = true;
    }

    onSavePiece(event: { piece: any, file: File | null }) {
        this.isSaving = true;
        this.magasinierService.updatePiece(event.piece.id, event.piece).subscribe({
            next: (saved) => {
                if (event.file) {
                    const formData = new FormData();
                    formData.append('file', event.file);
                    this.magasinierService.uploadPieceImage(saved.id!, formData).subscribe(() => {
                        this.finishPieceEdit('Pièce mise à jour avec succès');
                    });
                } else {
                    this.finishPieceEdit('Pièce mise à jour avec succès');
                }
            },
            error: () => {
                this.isSaving = false;
                this.notify('Erreur lors de la mise à jour', 'error');
            }
        });
    }

    private finishPieceEdit(msg: string) {
        this.isSaving = false;
        this.showPieceEditModal = false;
        this.notify(msg, 'success');
        this.loadArchivedPieces();
    }

    openEditProduit(prod: ProduitFini): void {
        this.selectedProduit = { ...prod };
        this.showProduitEditModal = true;
    }

    onSaveProduit(event: { produit: ProduitFini, file: File | null }) {
        this.isSaving = true;
        this.magasinierService.updateProduit(event.produit.id!, event.produit).subscribe({
            next: (saved) => {
                if (event.file) {
                    const formData = new FormData();
                    formData.append('file', event.file);
                    this.magasinierService.uploadProduitImage(saved.id!, formData).subscribe(() => {
                        this.finishProduitEdit('Produit mis à jour avec succès');
                    });
                } else {
                    this.finishProduitEdit('Produit mis à jour avec succès');
                }
            },
            error: () => {
                this.isSaving = false;
                this.notify('Erreur lors de la mise à jour', 'error');
            }
        });
    }

    private finishProduitEdit(msg: string) {
        this.isSaving = false;
        this.showProduitEditModal = false;
        this.notify(msg, 'success');
        this.loadArchivedProduits();
    }

    restoreItem(): void {
        if (!this.itemToRestore) return;
        const id = this.itemToRestore.id;
        this.showRestoreConfirm = false;

        switch (this.restoreType) {
            case 'piece':
                this.magasinierService.restorePiece(id).subscribe({
                    next: () => this.onRestoreSuccess('Pièce restaurée avec succès'),
                    error: () => this.notify('Erreur lors de la restauration', 'error')
                });
                break;
            case 'produit':
                this.magasinierService.restoreProduit(id).subscribe({
                    next: () => this.onRestoreSuccess('Produit restauré avec succès'),
                    error: () => this.notify('Erreur lors de la restauration', 'error')
                });
                break;
            case 'fournisseur':
                this.logistiqueService.restoreFournisseur(id).subscribe({
                    next: () => this.onRestoreSuccess('Fournisseur restauré avec succès'),
                    error: () => this.notify('Erreur lors de la restauration', 'error')
                });
                break;
            case 'bon':
                this.logistiqueService.reactivateBon(id).subscribe({
                    next: () => this.onRestoreSuccess('Bon réactivé avec succès'),
                    error: () => this.notify('Erreur lors de la réactivation', 'error')
                });
                break;
            case 'commande':
                const c = { ...this.itemToRestore, archived: false };
                this.logistiqueService.updateCommandeFournisseur(id, c).subscribe({
                    next: () => this.onRestoreSuccess('Commande restaurée avec succès'),
                    error: () => this.notify('Erreur lors de la restauration', 'error')
                });
                break;
        }
    }

    private onRestoreSuccess(msg: string) {
        this.notify(msg, 'success');
        this.itemToRestore = null;
        this.loadAllArchived();
    }

    deleteItemForever(): void {
        if (!this.itemToDelete) return;
        const id = this.itemToDelete.id;
        this.showDeleteConfirm = false;

        switch (this.deleteType) {
            case 'piece':
                this.magasinierService.deletePiecePermanently(id).subscribe({
                    next: () => this.onDeleteSuccess('Pièce supprimée définitivement'),
                    error: (err) => this.notify(err.error?.message || 'Erreur lors de la suppression', 'error')
                });
                break;
            case 'produit':
                this.magasinierService.deleteProduitPermanently(id).subscribe({
                    next: () => this.onDeleteSuccess('Produit supprimé définitivement'),
                    error: (err) => this.notify(err.error?.message || 'Erreur lors de la suppression', 'error')
                });
                break;
            case 'fournisseur':
                this.logistiqueService.deleteFournisseurPermanently(id).subscribe({
                    next: () => this.onDeleteSuccess('Fournisseur supprimé définitivement'),
                    error: (err) => this.notify(err.error?.message || 'Erreur lors de la suppression', 'error')
                });
                break;
            case 'bon':
                this.logistiqueService.deleteBonPermanently(id).subscribe({
                    next: () => this.onDeleteSuccess('Bon supprimé définitivement'),
                    error: (err) => this.notify(err.error?.message || 'Erreur lors de la suppression', 'error')
                });
                break;
            case 'commande':
                this.logistiqueService.deleteCommandePermanently(id).subscribe({
                    next: () => this.onDeleteSuccess('Commande supprimée définitivement'),
                    error: (err) => this.notify(err.error?.message || 'Erreur lors de la suppression', 'error')
                });
                break;
            default:
                this.notify('Suppression définitive non disponible pour ce type', 'error');
        }
    }

    private onDeleteSuccess(msg: string) {
        this.notify(msg, 'success');
        this.itemToDelete = null;
        this.loadAllArchived();
    }

    notify(message: string, type: 'success' | 'error'): void {
        this.notification = { message, type };
        this.cdr.detectChanges();
        if (isPlatformBrowser(this.platformId)) {
            const duration = type === 'success' ? 3000 : 5000;
            this.ngZone.runOutsideAngular(() => {
                setTimeout(() => {
                    this.ngZone.run(() => {
                        this.notification = null;
                        this.cdr.detectChanges();
                    });
                }, duration);
            });
        }
    }

    getImageUrl(url: string | null | undefined, type: 'piece' | 'product'): string {
        if (!url) {
            return type === 'piece' ? 'assets/images/default-piece.png' : 'assets/images/default-produit.png';
        }
        return this.entrepriseService.getImageUrl(url);
    }
}
