import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, HostListener, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeycloakService } from 'keycloak-angular';
import { MagasinierService } from '../../services/magasinier.service';
import { PieceDetachee, Categorie, ProduitFini, Parametre, ChampPersonnalise, DetailPiece, Stock, Unite } from '../../models/magasinier.models';
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
    unites: Unite[] = [];
    formError: string | null = null;

    showAdvancedFilters = false;
    filterCategory: string = 'all';
    filterStockStatus: string = 'all';
    filterMinPrice: number | null = null;
    filterMaxPrice: number | null = null;
    showDeleteConfirm = false;
    itemToDelete: PieceDetachee | null = null;

    // Searchable Category
    catSearchTerm: string = '';
    showCatSuggestions: boolean = false;
    filteredCategories: Categorie[] = [];

    showAssociatedProductsModal = false;
    selectedPieceForProducts: PieceDetachee | null = null;
    associatedProductsSearchTerm: string = '';


    // New properties for Master-Detail view
    activePiece: PieceDetachee | null = null;
    activeTab: string = 'overview'; // For detail view tabs
    viewMode: 'table' | 'grid' = 'table';


    parametres: Parametre | null = null;
    private imageCache = new Map<string, string>();

    private keycloak = inject(KeycloakService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);
    private ngZone = inject(NgZone);
    public entrepriseService = inject(EntrepriseService); // Changed to public for template access

    @HostListener('document:click', ['$event'])
    onClickOutside(event: MouseEvent) {
        if (this.showCatSuggestions) {
            const target = event.target as HTMLElement;
            if (!target.closest('.category-search-group')) {
                this.showCatSuggestions = false;
                this.cdr.detectChanges();
            }
        }
    }

    constructor(private magasinierService: MagasinierService) { }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.userRoles = this.keycloak.getUserRoles() || [];
            this.cdr.detectChanges();
            this.loadPieces();
            this.loadCategories();
            this.loadProduits();
            this.loadParametres();
            this.loadUnites();
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




    deletePieceImage(id: number): void {
        //  if (!confirm('Voulez-vous vraiment supprimer cette image ?')) return;
        this.magasinierService.deletePieceImage(id).subscribe({
            next: () => {
                this.notify('Image supprimée', 'success');
                this.loadPieces();
                if (this.activePiece?.id === id) {
                    this.activePiece.imageUrl = undefined;
                }
                this.cdr.detectChanges();
            },
            error: (err: any) => this.notify('Erreur lors de la suppression', 'error')
        });
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
            error: (err: any) => {
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
            error: (err: any) => {
                this.notify('Erreur lors du chargement des pièces', 'error');
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    loadEntreprise(): void {
        this.entrepriseService.getCurrentEntreprise().subscribe({
            next: (data) => {
                this.entreprise = data;
                this.cdr.detectChanges();
            },
            error: (err: any) => console.error('Erreur chargement entreprise:', err)
        });
    }

    loadCategories(): void {
        this.magasinierService.getCategories().subscribe({
            next: (data) => {
                this.categories = data || [];
                this.filteredCategories = [...this.categories];
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                console.error('Error loading categories:', err);
                this.cdr.detectChanges();
            }
        });
    }

    filterCategoriesList(): void {
        const term = this.catSearchTerm.toLowerCase();
        this.filteredCategories = this.categories.filter(c => 
            (c.nom || '').toLowerCase().includes(term)
        );
        this.showCatSuggestions = true;
    }

    selectCategory(catName: string): void {
        this.filterCategory = catName;
        this.catSearchTerm = catName === 'all' ? 'Toutes les catégories' : catName;
        this.showCatSuggestions = false;
        this.applyFilters();
    }

    loadProduits(): void {
        this.magasinierService.getProduits().subscribe({
            next: (data) => this.produitsFinis = data,
            error: (err: any) => console.error('Error loading products:', err)
        });
    }

    loadUnites(): void {
        this.magasinierService.getUnites().subscribe({
            next: (data) => {
                this.unites = data || [];
                this.cdr.detectChanges();
            },
            error: (err: any) => console.error('Error loading units:', err)
        });
    }

    handleQuickAddCategory(category: Categorie): void {
        this.magasinierService.createCategorie(category).subscribe({
            next: (cat) => {
                this.categories.push(cat);
                this.notify('Catégorie ajoutée', 'success');
                this.cdr.detectChanges();
            },
            error: (err: any) => this.notify('Erreur lors de l\'ajout de la catégorie', 'error')
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
                        error: (err: any) => finalize(prod)
                    });
                } else {
                    finalize(prod);
                }
            },
            error: (err: any) => this.notify('Erreur lors de l\'ajout du produit', 'error')
        });
    }


    loadParametres(): void {

        this.magasinierService.getAllParametres().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                    this.parametres = data[0];
                    this.cdr.detectChanges();
                }
            },
            error: (err: any) => console.error('Erreur chargement paramètres:', err)
        });
    }

    openCreateModal(): void {
        this.selectedPiece = null;
        this.formError = null;
        this.showCreateModal = true;
    }

    openEditModal(piece: PieceDetachee): void {
        this.selectedPiece = piece;
        this.formError = null;
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

        // if (pieceData.prixVente <= 0) {
        //     this.notify('Le prix d\'achat doit être supérieur à 0', 'error');
        //     return;
        // }

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
                error: (err: any) => {
                    const errorMsg = this.extractErrorMessage(err, 'Erreur lors de la mise à jour de la pièce.');
                    this.formError = errorMsg;
                    this.notify(errorMsg, 'error');
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
                error: (err: any) => {
                    const errorMsg = this.extractErrorMessage(err, 'Erreur lors de la création de la pièce.');
                    this.formError = errorMsg;
                    this.notify(errorMsg, 'error');
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

    deletePiece(id: number): void {
        this.magasinierService.deletePiece(id).subscribe({
            next: () => {
                this.notify('Pièce supprimée avec succès', 'success');
                this.loadPieces();
                this.cancelDelete();
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                const msg = this.extractErrorMessage(err, 'Erreur lors de la suppression de la pièce.');
                this.notify(msg, 'error');
                this.cancelDelete();
                this.cdr.detectChanges();
            }
        });
    }

    /**
     * Extracts a user-friendly error message from an HTTP error.
     * Avoids exposing raw technical/JSON errors to the user.
     */
    extractErrorMessage(err: any, defaultMsg: string): string {
        if (typeof err.error === 'object' && err.error !== null) {
            const m = err.error?.message || err.error?.error || err.error?.detail;
            if (m && typeof m === 'string' && m.length < 300 && !m.includes('com.') && !m.includes('java.')) {
                return m;
            }
        }
        if (typeof err.error === 'string' && err.error.length < 250
            && !err.error.includes('com.') && !err.error.includes('at ')) {
            return err.error;
        }
        if (err.status === 400) return 'Données invalides. Veuillez vérifier les champs saisis.';
        if (err.status === 409) return 'Ce code existe déjà ou la pièce est liée à un stock.';
        if (err.status === 404) return 'Pièce introuvable.';
        if (err.status === 500) return 'Une erreur serveur est survenue. Veuillez réessayer.';
        return defaultMsg;
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
        if (!url) return 'assets/images/default-piece.svg';
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
        this.associatedProductsList = [];
        this.loadingAssociated = true;
        this.showAssociatedProductsModal = true;

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
        this.catSearchTerm = '';
        this.filteredCategories = [...this.categories];
        this.applyFilters();
        this.cdr.detectChanges();
    }

    filteredPiecesList: PieceDetachee[] = [];

    pieceTrackBy(index: number, piece: PieceDetachee): string | number {
        return piece.id || index;
    }

    produitTrackBy(index: number, produit: ProduitFini): string | number {
        return produit.id || produit.code || index;
    }

    variantTrackBy(index: number, variant: any): string | number {
        return variant.id || index;
    }

    switchTab(tab: string): void {
        this.activeTab = tab;
        this.cdr.detectChanges();
    }

    applyFilters(): void {
        let results = this.pieces;

        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            results = results.filter(p => {
                const designation = (p.designation || '').toLowerCase();
                const reference = (p.reference || '').toLowerCase();
                const hasCodeBarreMatch = p.details?.some(d => (d.codeBarre || '').toLowerCase().includes(term));

                if (this.searchCategory === 'all') {
                    const matchesBasic = designation.includes(term) ||
                        reference.includes(term) ||
                        hasCodeBarreMatch;
                    const matchesProduct = p.produitsAssocies?.some(prod =>
                        (prod.designation || '').toLowerCase().includes(term) ||
                        (prod.code || '').toLowerCase().includes(term)
                    );
                    return matchesBasic || !!matchesProduct;
                }
                if (this.searchCategory === 'reference') return reference.includes(term);
                if (this.searchCategory === 'designation') return designation.includes(term);
                if (this.searchCategory === 'codeBarre') return hasCodeBarreMatch;
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

        // Ensure activePiece is still in the filtered list
        if (this.activePiece && !this.filteredPiecesList.find(p => p.id === this.activePiece?.id)) {
            this.activePiece = null;
        }
    }

    selectPiece(piece: PieceDetachee): void {
        this.activePiece = piece;
        this.cdr.detectChanges();
    }

    closeDetail(): void {
        this.activePiece = null;
        this.cdr.detectChanges();
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

    getVariantAttributes(detail: any): string[] {
        if (detail._attrList) return detail._attrList;

        const attributes = detail.attributs || {};
        const list = Object.entries(attributes)
            .filter(([key, value]) => !key.startsWith('_') && value !== null && value !== '' && String(value).trim() !== '')
            .map(([key, value]) => `${key} : ${value}`);

        detail._attrList = list;
        return list;
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

    getVariantColorClass(label: string): string {
        const colors = ['v-yellow', 'v-teal', 'v-blue', 'v-pink-red', 'v-purple', 'v-lavender'];
        let hash = 0;
        for (let i = 0; i < label.length; i++) {
            hash = label.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }


}
