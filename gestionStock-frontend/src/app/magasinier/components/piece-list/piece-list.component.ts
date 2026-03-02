import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, HostListener, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeycloakService } from 'keycloak-angular';
import { MagasinierService } from '../../services/magasinier.service';
import { PieceDetachee, Categorie, ProduitFini, Parametre, ChampPersonnalise, DetailPiece, Stock } from '../../models/magasinier.models';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';

import { PieceFormComponent } from '../piece-form/piece-form.component';

@Component({
    selector: 'app-piece-list',
    standalone: true,
    imports: [CommonModule, FormsModule, PieceFormComponent],
    templateUrl: './piece-list.component.html',
    styleUrl: './piece-list.component.css'
})
export class PieceListComponent implements OnInit {
    pieces: PieceDetachee[] = [];
    loading: boolean = false;
    showCreateModal = false;
    selectedPiece: PieceDetachee | null = null;
    notification: { message: string, type: 'success' | 'error' } | null = null;
    searchTerm: string = '';
    searchCategory: string = 'all';
    entreprise: Entreprise | null = null;
    userRoles: string[] = [];
    categories: Categorie[] = [];
    produitsFinis: ProduitFini[] = [];

    showAdvancedFilters = false;
    filterCategory: string = 'all';
    filterStockStatus: string = 'all';
    filterMinPrice: number | null = null;
    filterMaxPrice: number | null = null;

    showDeleteConfirm = false;
    itemToDelete: PieceDetachee | null = null;

    showAssociatedProductsModal = false;
    selectedPieceForProducts: PieceDetachee | null = null;
    associatedProductsSearchTerm: string = '';


    parametres: Parametre | null = null;
    private imageCache = new Map<string, string>();

    private keycloak = inject(KeycloakService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);
    private ngZone = inject(NgZone);
    private entrepriseService = inject(EntrepriseService);

    constructor(private magasinierService: MagasinierService) { }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.userRoles = this.keycloak.getUserRoles() || [];
            this.cdr.detectChanges();
            this.loadPieces();
            this.loadCategories();
            this.loadProduits();
            this.loadParametres();
            this.loadEntreprise();
        }
    }

    hasRole(role: string): boolean {
        const targetRole = role.toUpperCase().replace('ROLE_', '');
        return this.userRoles.some(r => {
            const upperR = r.toUpperCase().replace('ROLE_', '');
            return upperR === targetRole;
        });
    }

    canManage(): boolean {
        return this.hasRole('MAGASINIER');
    }



    uploadImage(event: Event, type: 'piece' | 'produit', id: number): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            this.doUpload(file, id);
        }
    }

    private doUpload(file: File, id: number, successMessage: string = 'Image mise à jour'): void {
        const formData = new FormData();
        formData.append('file', file);

        this.magasinierService.uploadPieceImage(id, formData).subscribe({
            next: (updatedPiece) => {
                this.notify(successMessage, 'success');
                this.loadPieces();
                if (this.selectedPiece?.id === id) {
                    this.selectedPiece = updatedPiece;
                }
            },
            error: (err) => {
                const msg = typeof err.error === 'string' ? err.error : (err.error?.message || 'Erreur lors du chargement de l\'image');
                this.notify(msg, 'error');
            }
        });
    }

    loadPieces(): void {
        this.loading = true;
        this.magasinierService.getPieces().subscribe({
            next: (data) => {
                this.pieces = data || [];
                this.loading = false;
                this.applyFilters();
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.notify('Erreur lors du chargement des pièces', 'error');
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    loadEntreprise(): void {
        this.entrepriseService.getAllEntreprises().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                    this.entreprise = data[0];
                    this.cdr.detectChanges();
                }
            }
        });
    }

    loadCategories(): void {
        this.magasinierService.getCategories().subscribe({
            next: (data) => {
                this.categories = data || [];
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading categories:', err);
                this.cdr.detectChanges();
            }
        });
    }

    loadProduits(): void {
        this.magasinierService.getProduits().subscribe({
            next: (data) => this.produitsFinis = data,
            error: (err) => console.error('Error loading products:', err)
        });
    }

    handleQuickAddCategory(category: Categorie): void {
        this.magasinierService.createCategorie(category).subscribe({
            next: (cat) => {
                this.categories.push(cat);
                this.notify('Catégorie ajoutée', 'success');
                this.cdr.detectChanges();
            },
            error: (err) => this.notify('Erreur lors de l\'ajout de la catégorie', 'error')
        });
    }

    handleQuickAddProduct(data: { product: ProduitFini, file: File | null }): void {
        this.magasinierService.createProduit(data.product).subscribe({
            next: (prod) => {
                const finalize = (finalProd: ProduitFini) => {
                    this.produitsFinis.push(finalProd);
                    this.notify('Produit ajouté', 'success');
                    this.cdr.detectChanges();
                };

                if (data.file && prod.id) {
                    const formData = new FormData();
                    formData.append('file', data.file);
                    this.magasinierService.uploadProduitImage(prod.id, formData).subscribe({
                        next: (updated) => finalize(updated),
                        error: (err) => finalize(prod)
                    });
                } else {
                    finalize(prod);
                }
            },
            error: (err) => this.notify('Erreur lors de l\'ajout du produit', 'error')
        });
    }


    loadParametres(): void {
        const entrepriseId = this.pieces.length > 0 ? this.pieces[0].entreprise?.id : null;
        if (entrepriseId) {
            this.magasinierService.getParametresByEntreprise(entrepriseId).subscribe({
                next: (data) => {
                    this.parametres = data;
                    this.cdr.detectChanges();
                },
                error: (err) => console.error('Error loading specific parameters:', err)
            });
        } else {
            this.magasinierService.getAllParametres().subscribe({
                next: (data) => {
                    if (data && data.length > 0) {
                        this.parametres = data[0];
                        this.cdr.detectChanges();
                    }
                },
                error: (err) => console.error('Error loading all parameters:', err)
            });
        }
    }

    openCreateModal(): void {
        this.selectedPiece = null;
        this.showCreateModal = true;
    }

    openEditModal(piece: PieceDetachee): void {
        this.selectedPiece = piece;
        this.showCreateModal = true;
        this.cdr.detectChanges();
    }

    closeCreateModal(): void {
        this.showCreateModal = false;
        this.selectedPiece = null;
        this.cdr.detectChanges();
    }

    handleSavePiece(data: { piece: PieceDetachee, file: File | null }): void {
        const pieceData = data.piece;
        const file = data.file;

        if (pieceData.prixVente <= 0) {
            this.notify('Le prix d\'achat doit être supérieur à 0', 'error');
            return;
        }

        if (this.selectedPiece && this.selectedPiece.id) {
            this.magasinierService.updatePiece(this.selectedPiece.id, pieceData).subscribe({
                next: (saved) => {
                    if (file && saved.id) {
                        this.doUpload(file, saved.id, 'Pièce mise à jour');
                    } else {
                        this.notify('Pièce mise à jour', 'success');
                        this.loadPieces();
                    }
                    this.closeCreateModal();
                },
                error: (err) => {
                    const errorMsg = err.error?.message || err.error || 'Erreur lors de la mise à jour';
                    this.notify(typeof errorMsg === 'string' ? errorMsg : 'Erreur réseau', 'error');
                }
            });
        } else {
            this.magasinierService.createPiece(pieceData).subscribe({
                next: (saved) => {
                    if (file && saved.id) {
                        this.doUpload(file, saved.id, 'Pièce créée');
                    } else {
                        this.notify('Pièce créée', 'success');
                        this.loadPieces();
                    }
                    this.closeCreateModal();
                },
                error: (err) => {
                    const errorMsg = err.error?.message || err.error || 'Erreur lors de la création';
                    this.notify(typeof errorMsg === 'string' ? errorMsg : 'Erreur de validation. Vérifiez les champs.', 'error');
                    console.error('Save error details:', err.error);
                }
            });
        }
    }

    confirmDelete(piece: PieceDetachee): void {
        this.itemToDelete = piece;
        this.showDeleteConfirm = true;
        this.cdr.detectChanges();
    }

    cancelDelete(): void {
        this.itemToDelete = null;
        this.showDeleteConfirm = false;
        this.cdr.detectChanges();
    }

    deletePiece(codeBarre: string): void {
        this.magasinierService.deletePiece(codeBarre).subscribe({
            next: () => {
                this.notify('Pièce supprimée avec succès', 'success');
                this.loadPieces();
                this.cancelDelete();
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.notify('Erreur lors de la suppression', 'error');
                console.error(err);
                this.cancelDelete();
                this.cdr.detectChanges();
            }
        });
    }

    notify(message: string, type: 'success' | 'error'): void {
        this.notification = { message, type };
        this.cdr.detectChanges();
        if (isPlatformBrowser(this.platformId)) {
            const duration = type === 'success' ? 1500 : 5000;
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

    getImageUrl(url: string | null | undefined): string {
        if (!url) return 'assets/images/default-produit.svg';
        if (this.imageCache.has(url)) return this.imageCache.get(url)!;

        let result = url;
        if (url.startsWith('/api/images') || url.startsWith('/uploads')) {
            result = `http://localhost:8081${url}`;
        } else if (url.includes('/remote.php/dav/files/')) {
            const parts = url.split('/');
            const filename = parts[parts.length - 1];
            result = `http://localhost:8081/api/images/${filename}`;
        }

        this.imageCache.set(url, result);
        return result;
    }

    closeAssociatedProductsModal(): void {
        this.showAssociatedProductsModal = false;
        // Clear data after a short delay so the closing animation stays smooth
        setTimeout(() => {
            this.selectedPieceForProducts = null;
            this.associatedProductsSearchTerm = '';
            this.associatedProductsList = [];
            this.cdr.detectChanges();
        }, 200);
    }

    triggerChangeDetection(): void {
        this.cdr.detectChanges();
    }

    loadingAssociated = false;
    associatedProductsList: ProduitFini[] = [];

    showAssociatedProducts(piece: PieceDetachee): void {
        this.selectedPieceForProducts = piece;
        this.associatedProductsSearchTerm = '';
        this.associatedProductsList = []; // Empty initially to render modal quickly
        this.loadingAssociated = true;
        this.showAssociatedProductsModal = true;

        // Defer filtering and DOM creation to the next event loop tick
        setTimeout(() => {
            this.applyAssociatedFilter();
            this.loadingAssociated = false;
            this.cdr.detectChanges();
        }, 10);
    }

    applyAssociatedFilter(): void {
        const produits = this.selectedPieceForProducts?.produitsAssocies || [];
        if (!this.associatedProductsSearchTerm) {
            this.associatedProductsList = produits;
            return;
        }
        const term = this.associatedProductsSearchTerm.toLowerCase();
        this.associatedProductsList = produits.filter(p => {
            const designation = (p.designation || '').toLowerCase();
            const code = (p.code || '').toLowerCase();
            return designation.includes(term) || code.includes(term);
        });
    }

    toggleAdvancedFilters(): void {
        this.showAdvancedFilters = !this.showAdvancedFilters;
        this.cdr.detectChanges();
    }

    resetFilters(): void {
        this.searchTerm = '';
        this.searchCategory = 'all';
        this.filterCategory = 'all';
        this.filterStockStatus = 'all';
        this.filterMinPrice = null;
        this.filterMaxPrice = null;
        this.applyFilters();
        this.cdr.detectChanges();
    }

    filteredPiecesList: PieceDetachee[] = [];

    pieceTrackBy(index: number, piece: PieceDetachee): string | number {
        return piece.id || piece.codeBarre || index;
    }

    produitTrackBy(index: number, produit: ProduitFini): string | number {
        return produit.id || produit.code || index;
    }

    applyFilters(): void {
        let results = this.pieces;

        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            results = results.filter(p => {
                const designation = (p.designation || '').toLowerCase();
                const reference = (p.reference || '').toLowerCase();
                const codeBarre = (p.codeBarre || '').toString().toLowerCase();

                if (this.searchCategory === 'all') {
                    const matchesBasic = designation.includes(term) ||
                        reference.includes(term) ||
                        codeBarre.includes(term);
                    const matchesProduct = p.produitsAssocies?.some(prod =>
                        (prod.designation || '').toLowerCase().includes(term) ||
                        (prod.code || '').toLowerCase().includes(term)
                    );
                    return matchesBasic || !!matchesProduct;
                }
                if (this.searchCategory === 'reference') return reference.includes(term);
                if (this.searchCategory === 'designation') return designation.includes(term);
                if (this.searchCategory === 'codeBarre') return codeBarre.includes(term);
                if (this.searchCategory === 'produit') {
                    return !!p.produitsAssocies?.some(prod =>
                        (prod.designation || '').toLowerCase().includes(term) ||
                        (prod.code || '').toLowerCase().includes(term)
                    );
                }
                return true;
            });
        }

        if (this.filterCategory !== 'all') {
            results = results.filter(p => p.categorie?.nom === this.filterCategory);
        }
        if (this.filterStockStatus !== 'all') {
            results = results.filter(p => {
                const totalStock = this.getTotalStock(p);

                if (this.filterStockStatus === 'out') return totalStock <= 0;
                if (this.filterStockStatus === 'low') return totalStock < (p.seuilMinimum || 0) && totalStock > 0;
                if (this.filterStockStatus === 'ok') return totalStock >= (p.seuilMinimum || 0);
                return true;
            });
        }

        if (this.filterMinPrice !== null && this.filterMinPrice !== undefined) {
            results = results.filter(p => (p.prixVente || 0) >= (this.filterMinPrice || 0));
        }
        if (this.filterMaxPrice !== null && this.filterMaxPrice !== undefined) {
            results = results.filter(p => (p.prixVente || 0) <= (this.filterMaxPrice || 0));
        }

        this.filteredPiecesList = results;
    }

    getTotalStock(piece: any): number {
        if (piece._totalStock !== undefined) return piece._totalStock;

        let total = 0;
        if (piece.stock && !Array.isArray(piece.stock)) {
            total = piece.stock.quantite || 0;
        } else if (piece.stocks && Array.isArray(piece.stocks)) {
            total = piece.stocks.reduce((sum: number, s: any) => sum + (s.quantite || 0), 0);
        } else if (piece.details && piece.details.length > 0) {
            total = piece.details.reduce((sum: number, dp: any) => sum + (dp.stock?.quantite || 0), 0);
        }

        piece._totalStock = total;
        return total;
    }

    getVariantLabel(detail: any): string {
        if (detail._label !== undefined) return detail._label;

        const attributes = detail.attributs || {};
        const label = Object.entries(attributes)
            .filter(([key, value]) => !key.startsWith('_') && value !== null && value !== '' && String(value).trim() !== '')
            .map(([_, value]) => value)
            .join(' - ');

        detail._label = label || 'Standard';
        return detail._label;
    }

    isArray(obj: any): boolean {
        return Array.isArray(obj);
    }

    getUnassignedStock(piece: any): number {
        if (piece._unassignedStock !== undefined) return piece._unassignedStock;

        let stock = 0;
        if (piece.stock && !Array.isArray(piece.stock)) {
            stock = piece.stock.quantite || 0;
        } else if (piece.stocks && Array.isArray(piece.stocks)) {
            stock = piece.stocks.reduce((sum: number, s: any) => sum + (s.quantite || 0), 0);
        }

        piece._unassignedStock = stock;
        return stock;
    }
}
