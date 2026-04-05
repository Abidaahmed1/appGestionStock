import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, HostListener, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeycloakService } from 'keycloak-angular';
import { MagasinierService } from '../../services/magasinier.service';
import { PieceDetachee, Categorie, ProduitFini, Parametre, DetailPiece, Unite } from '../../models/magasinier.models';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';
import { DocumentConfigService, DocumentType } from '../../../admin/services/document-config.service';

import Swal from 'sweetalert2';

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
    sortOption: string = 'designation_asc';
    showDeleteConfirm = false;
    itemToDelete: PieceDetachee | null = null;
    isBulkDelete = false;

    // Searchable Category
    catSearchTerm: string = '';
    showCatSuggestions: boolean = false;
    filteredCategories: Categorie[] = [];

    showAssociatedProductsModal = false;
    selectedPieceForProducts: PieceDetachee | null = null;
    associatedProductsSearchTerm: string = '';


    // New properties for Master-Detail view
    activePiece: PieceDetachee | null = null;
    activeGroup: { main: PieceDetachee; variations: PieceDetachee[]; expanded: boolean } | null = null;
    activeTab: string = 'overview'; // For detail view tabs
    viewMode: 'table' | 'grid' = 'table';

    tableLayout: 'expanded' | 'collapsed' = 'expanded';
    showLayoutMenu = false;

    showAssocProducts: boolean = true; // Added for expanding/collapsing the products list

    parametres: Parametre[] = [];
    visibleVarianteIds: number[] = [];
    private imageCache = new Map<string, string>();

    // Multi-selection
    selectedIds: Set<number> = new Set();

    private keycloak = inject(KeycloakService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);
    private ngZone = inject(NgZone);
    private docConfigService = inject(DocumentConfigService);
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
        if (this.showLayoutMenu) {
            const target = event.target as HTMLElement;
            if (!target.closest('.layout-toggle-container')) {
                this.showLayoutMenu = false;
                this.cdr.detectChanges();
            }
        }
        if (this.showSlimLayoutMenu) {
            const target = event.target as HTMLElement;
            if (!target.closest('.slim-layout-toggle')) {
                this.showSlimLayoutMenu = false;
                this.cdr.detectChanges();
            }
        }
    }

    get currencySymbol(): string {
        return this.entrepriseService.getDeviseSymbol(this.entreprise);
    }

    constructor(private magasinierService: MagasinierService) { }

    private groupedPiecesCache: { main: PieceDetachee; variations: PieceDetachee[]; expanded: boolean; expandedSide?: boolean }[] = [];
    private lastFilteredListRef: PieceDetachee[] = [];

    slimSearchTerm: string = '';
    slimFilteredGroups: any[] = [];
    slimFilteredFlatPieces: PieceDetachee[] = [];

    private slimSearchTimeout: ReturnType<typeof setTimeout> | null = null;

    onSlimSearchChange(term: string) {
        this.slimSearchTerm = term;
        if (this.slimSearchTimeout) {
            clearTimeout(this.slimSearchTimeout);
        }
        this.slimSearchTimeout = setTimeout(() => {
            this.applySlimFilters();
            this.cdr.detectChanges();
        }, 300);
    }

    applySlimFilters() {
        const groups = this.groupedPiecesList; // triggers grouping if needed
        const list = this.filteredPiecesList;

        if (!this.slimSearchTerm) {
            this.slimFilteredGroups = groups;
            this.slimFilteredFlatPieces = list;
            return;
        }

        const term = this.slimSearchTerm.toLowerCase();
        this.slimFilteredGroups = groups.filter(g => {
            const matchesMain = g.main.designation?.toLowerCase().includes(term) || g.main.reference?.toLowerCase().includes(term);
            const matchesVariations = g.variations.some(v => v.designation?.toLowerCase().includes(term) || v.reference?.toLowerCase().includes(term));
            return matchesMain || matchesVariations;
        });

        this.slimFilteredFlatPieces = list.filter(p =>
            p.designation?.toLowerCase().includes(term) ||
            p.reference?.toLowerCase().includes(term)
        );
    }

    get groupedPiecesList(): { main: PieceDetachee; variations: PieceDetachee[]; expanded: boolean; expandedSide?: boolean }[] {
        if (this.lastFilteredListRef === this.filteredPiecesList) {
            return this.groupedPiecesCache;
        }

        const map = new Map<string, { main: PieceDetachee; variations: PieceDetachee[]; expanded: boolean; expandedSide?: boolean }>();
        const oldStateMap = new Map<string, any>();

        for (const oldGroup of this.groupedPiecesCache) {
            oldStateMap.set(oldGroup.main.designation || 'Sans Nom', oldGroup);
        }

        for (const piece of this.filteredPiecesList) {
            const key = piece.designation || 'Sans Nom';
            if (!map.has(key)) {
                let expanded = false;
                let expandedSide = false;
                if (oldStateMap.has(key)) {
                    expanded = oldStateMap.get(key).expanded;
                    expandedSide = oldStateMap.get(key).expandedSide;
                }
                map.set(key, { main: piece, variations: [], expanded, expandedSide });
            } else {
                map.get(key)!.variations.push(piece);
            }
        }

        this.groupedPiecesCache = Array.from(map.values());
        this.lastFilteredListRef = this.filteredPiecesList;
        return this.groupedPiecesCache;
    }

    toggleGroupMode(mode: 'expanded' | 'collapsed') {
        this.tableLayout = mode;
        this.showLayoutMenu = false;
        this.cdr.detectChanges();
    }

    slimListLayout: 'expanded' | 'collapsed' = 'collapsed';
    showSlimLayoutMenu = false;

    toggleSlimMenu(event: Event) {
        event.stopPropagation();
        this.showSlimLayoutMenu = !this.showSlimLayoutMenu;
        this.cdr.detectChanges();
    }

    toggleSlimLayoutMode(mode: 'expanded' | 'collapsed') {
        this.slimListLayout = mode;
        this.showSlimLayoutMenu = false;
        this.cdr.detectChanges();
    }

    toggleGroup(group: any, event: Event) {
        event.stopPropagation();
        group.expanded = !group.expanded;
        this.cdr.detectChanges();
    }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.userRoles = this.keycloak.getUserRoles() || [];

            this.loadPieces();
            this.loadCategories();
            this.loadProduits();
            this.loadParametres();
            this.loadUnites();
            this.loadEntreprise();
            this.loadDisplaySettings();

            const draft = sessionStorage.getItem('piece_draft');
            if (draft) {
                try {
                    const parsed = JSON.parse(draft);
                    this.selectedPiece = parsed.piece;
                    this.showCreateModal = true;
                } catch (e) {
                    console.error('Error parsing piece_draft', e);
                }
            }

            this.cdr.detectChanges();
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
        return this.hasRole('MAGASINIER') || this.hasRole('ADMINISTRATEUR');
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
                if (this.activePiece?.id === id) {
                    this.activePiece = updatedPiece;
                }
            },
            error: (err: any) => {
                const msg = typeof err.error === 'string' ? err.error : (err.error?.message || 'Erreur lors du chargement de l\'image');
                this.notify(msg, 'error');
                this.loadPieces(); // Refresh text data even if image upload failed
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

                // Refresh activePiece from the new list to show latest data in detail view
                if (this.activePiece) {
                    const fresh = this.pieces.find(p => p.id === this.activePiece?.id);
                    if (fresh) {
                        this.activePiece = fresh;
                    }
                }

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

    loadDisplaySettings(): void {
        // On utilise BON_ENTREE par défaut pour la liste globale des pièces
        this.docConfigService.getSettingByType(DocumentType.BON_ENTREE).subscribe({
            next: (setting) => {
                this.visibleVarianteIds = setting.visibleVarianteIds || [];
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Erreur chargement config visibilité:', err)
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
                this.categories = [...this.categories, cat];
                this.notify('Catégorie ajoutée', 'success');
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                const msg = this.extractErrorMessage(err, 'Erreur lors de l\'ajout de la catégorie');
                this.notify(msg, 'error');
                this.cdr.detectChanges();
            }
        });
    }

    handleQuickAddProduct(data: { product: ProduitFini, file: File | null }): void {
        this.magasinierService.createProduit(data.product).subscribe({
            next: (prod) => {
                const finalize = (finalProd: ProduitFini) => {
                    this.produitsFinis = [...this.produitsFinis, finalProd];
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
            error: (err: any) => {
                const msg = this.extractErrorMessage(err, 'Erreur lors de l\'ajout du produit');
                this.notify(msg, 'error');
                this.cdr.detectChanges();
            }
        });
    }


    loadParametres(): void {
        this.magasinierService.getAllParametres().subscribe({
            next: (data) => {
                this.parametres = data || [];
                this.cdr.detectChanges();
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

    openDuplicateModal(piece: PieceDetachee): void {
        const duplicatedPiece = {
            ...piece,
            id: undefined,
            reference: 'AUTO',
            codeBarre: '',
            quantite: 0,
            archivee: false
        };

        if (piece.details) {
            duplicatedPiece.details = piece.details.map(d => ({
                ...d,
                id: undefined
            }));
        }
        if (piece.produitsAssocies) {
            duplicatedPiece.produitsAssocies = [...piece.produitsAssocies];
        }

        this.selectedPiece = duplicatedPiece;
        this.formError = null;
        this.showCreateModal = true;
        this.cdr.detectChanges();
    }

    closeCreateModal(): void {
        this.showCreateModal = false;
        this.selectedPiece = null;
        this.cdr.detectChanges();
    }

    isSavingPiece: boolean = false;

    handleSavePiece(data: { piece: PieceDetachee, file: File | null }): void {
        console.log('[DEBUG] piece-list component: handleSavePiece called', data);
        const pieceData = data.piece;
        const file = data.file;

        this.isSavingPiece = true;

        if (this.selectedPiece && this.selectedPiece.id) {
            console.log(`[DEBUG] Updating piece with id: ${this.selectedPiece.id}`);
            this.magasinierService.updatePiece(this.selectedPiece.id, pieceData).subscribe({
                next: (saved) => {
                    console.log(`[DEBUG] updatePiece SUCCESS`, saved);
                    if (this.activePiece?.id === saved.id) {
                        this.activePiece = saved;
                    }
                    if (file && saved.id) {
                        this.doUpload(file, saved.id, 'Pièce mise à jour');
                    } else {
                        this.notify('La pièce a été mise à jour avec succès.', 'success');
                        this.loadPieces();
                    }
                    this.isSavingPiece = false;
                    this.closeCreateModal();
                },
                error: (err: any) => {
                    this.isSavingPiece = false;
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
                        this.notify('La pièce a été créée avec succès.', 'success');
                        this.loadPieces();
                    }
                    this.isSavingPiece = false;
                    this.closeCreateModal();
                },
                error: (err: any) => {
                    this.isSavingPiece = false;
                    const errorMsg = this.extractErrorMessage(err, 'Erreur lors de la création de la pièce.');
                    this.formError = errorMsg;
                    this.notify(errorMsg, 'error');
                }
            });
        }
    }

    confirmDelete(piece: PieceDetachee): void {
        this.isBulkDelete = false;
        this.itemToDelete = piece;
        this.showDeleteConfirm = true;
        this.cdr.detectChanges();
    }

    cancelDelete(): void {
        this.itemToDelete = null;
        this.isBulkDelete = false;
        this.showDeleteConfirm = false;
        this.cdr.detectChanges();
    }

    deletePiece(id: number): void {
        const designation = this.itemToDelete?.designation || 'la pièce';
        this.loading = true; // Prevents double-clicks

        this.magasinierService.deletePiece(id).subscribe({
            next: () => {
                this.notify(`Pièce "${designation}" supprimée avec succès`, 'success');

                // Optimistic UI update: remove from local lists immediately
                this.pieces = this.pieces.filter(p => p.id !== id);
                this.filteredPiecesList = this.filteredPiecesList.filter(p => p.id !== id);

                // If deleted piece was the active one, close detail view
                if (this.activePiece?.id === id) {
                    this.activePiece = null;
                }

                this.loading = false;
                this.loadPieces(); // Still reload from server as safety
                this.cancelDelete();
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                this.loading = false;
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
        console.error(' Error details:', err);

        // 1. Try to find a message in the error body (Erreur object or raw JSON)
        if (err.error) {
            // Case where err.error is a JSON object (Standard Erreur or Map from backend)
            if (typeof err.error === 'object') {
                const priorityFields = ['message', 'error', 'details', 'detail', 'msg'];
                for (const field of priorityFields) {
                    if (err.error[field] && typeof err.error[field] === 'string' && err.error[field].length > 0) {
                        return err.error[field];
                    }
                }
            }

            // Case where err.error is a raw string (sometimes happens with 400 Bad Request)
            if (typeof err.error === 'string' && err.error.length < 500 && !err.error.includes('<!DOCTYPE')) {
                return err.error;
            }
        }

        // 2. Specific HTTP Status fallback if no body message found
        if (err.status === 409) {
            return 'Impossible de supprimer cet élément car il est utilisé ailleurs (historique, bons, ou produits).';
        }
        if (err.status === 403) {
            return 'Vous n\'avez pas les droits nécessaires pour effectuer cette action.';
        }
        if (err.status === 401) {
            return 'Votre session a expiré. Veuillez vous reconnecter.';
        }
        if (err.status === 0) {
            return 'Serveur injoignable. Vérifiez votre connexion.';
        }

        // 3. Status text or message field
        if (err.statusText && err.statusText !== 'OK' && err.statusText !== 'Unknown Error') {
            return `Erreur ${err.status} : ${err.statusText}`;
        }

        return defaultMsg || 'Une erreur inattendue est survenue.';
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
        this.sortOption = 'designation_asc';
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

    groupTrackBy(index: number, group: any): string | number {
        return group.main?.id || index;
    }


    private mainSearchTimeout: ReturnType<typeof setTimeout> | null = null;

    applyFilters(fromDebounce = false): void {
        // If called directly from template (ngModelChange), debounce it
        if (!fromDebounce) {
            if (this.mainSearchTimeout) {
                clearTimeout(this.mainSearchTimeout);
            }
            this.mainSearchTimeout = setTimeout(() => {
                this.applyFilters(true);
                this.cdr.detectChanges();
            }, 300);
            return;
        }

        let results = this.pieces;

        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            results = results.filter(p => {
                const designation = (p.designation || '').toLowerCase();
                const reference = (p.reference || '').toLowerCase();
                const codeBarre = (p.codeBarre || '').toLowerCase();

                const hasCodeBarreMatch = codeBarre.includes(term) ||
                    (p.variations?.some(v => (v.codeBarre || '').toLowerCase().includes(term)) ?? false);

                if (this.searchCategory === 'all') {
                    const matchesBasic = designation.includes(term) ||
                        reference.includes(term) ||
                        hasCodeBarreMatch;

                    const matchesProduct = p.produitsAssocies?.some(prod =>
                        (prod.designation || '').toLowerCase().includes(term) ||
                        (prod.code || '').toLowerCase().includes(term)
                    );

                    const matchesVariation = p.variations?.some(v =>
                        (v.designation || '').toLowerCase().includes(term) ||
                        (v.reference || '').toLowerCase().includes(term)
                    ) ?? false;

                    return matchesBasic || !!matchesProduct || matchesVariation;
                }
                if (this.searchCategory === 'reference') {
                    return reference.includes(term) ||
                        (p.variations?.some(v => (v.reference || '').toLowerCase().includes(term)) ?? false);
                }
                if (this.searchCategory === 'designation') {
                    return designation.includes(term) ||
                        (p.variations?.some(v => (v.designation || '').toLowerCase().includes(term)) ?? false);
                }
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

        switch (this.sortOption) {
            case 'designation_asc':
                results.sort((a, b) => (a.designation || '').localeCompare(b.designation || ''));
                break;
            case 'designation_desc':
                results.sort((a, b) => (b.designation || '').localeCompare(a.designation || ''));
                break;
            case 'price_asc':
                results.sort((a, b) => (a.prixVente || 0) - (b.prixVente || 0));
                break;
            case 'price_desc':
                results.sort((a, b) => (b.prixVente || 0) - (a.prixVente || 0));
                break;
            case 'stock_asc':
                results.sort((a, b) => this.getTotalStock(a) - this.getTotalStock(b));
                break;
            case 'stock_desc':
                results.sort((a, b) => this.getTotalStock(b) - this.getTotalStock(a));
                break;
        }

        this.filteredPiecesList = results;

        // Ensure activePiece is still in the filtered list
        if (this.activePiece && !this.filteredPiecesList.find(p => p.id === this.activePiece?.id)) {
            this.activePiece = null;
        }
        if (this.activeGroup && !this.filteredPiecesList.find(p => p.designation === this.activeGroup?.main.designation)) {
            this.activeGroup = null;
        }

        this.applySlimFilters();
    }

    selectPiece(piece: PieceDetachee): void {
        this.activePiece = piece;
        this.activeGroup = null;
        this.activeTab = 'overview';
        this.cdr.detectChanges();
    }

    selectGroup(group: any, event: Event): void {
        event.stopPropagation();

        // Force the sidebar tree to toggle open/close when clicking the main group
        group.expandedSide = !group.expandedSide;

        this.activeGroup = group;
        this.activePiece = null;
        this.activeTab = 'overview';
        this.cdr.detectChanges();
    }

    selectPieceFromGroup(variant: PieceDetachee, event: Event): void {
        event.stopPropagation();
        this.activePiece = variant;
        // Do not reset activeGroup, so the tree on the left stays visible for the group.
        this.activeTab = 'overview';
        this.cdr.detectChanges();
    }

    closeDetail(): void {
        this.activePiece = null;
        this.activeGroup = null;
        this.cdr.detectChanges();
    }

    switchTab(tab: string): void {
        this.activeTab = tab;
        this.cdr.detectChanges();
    }



    getTotalStock(piece: any): number {
        return piece.quantite || 0;
    }

    getVariantLabel(variant: PieceDetachee): string {
        if (!variant.details || variant.details.length === 0) return 'Standard';

        const label = variant.details
            .filter(d => d.parametre?.variante && d.valeur)
            .map(d => d.valeur)
            .join(' - ');

        return label || 'Standard';
    }

    getStockPercentage(variant: any): number {
        if (!this.activePiece) return 0;
        const current = this.activePiece.quantite || 0;
        if (current <= 0) return 0;
        const max = this.activePiece.seuilMaximum || (this.activePiece.seuilMinimum * 5) || 100;
        const percentage = (current / max) * 100;
        return Math.min(percentage, 100);
    }

    getVariantAttributes(piece: any): string[] {
        if (!piece || !piece.details) return [];

        if (this.visibleVarianteIds && this.visibleVarianteIds.length > 0) {
            return piece.details
                .filter((d: any) => {
                    const hasValue = d.valeur && d.valeur.trim() !== '' && d.valeur !== '-';
                    return d.parametre && d.parametre.id && hasValue && this.visibleVarianteIds.includes(d.parametre.id!);
                })
                .map((d: any) => `${d.parametre.nom}: ${d.valeur}`);
        }
        return [];
    }

    getGroupAttributes(group: { main: PieceDetachee, variations: PieceDetachee[] }): { key: string, values: string[] }[] {
        if (!group) return [];
        const map = new Map<string, Set<string>>();
        const allPieces = [group.main, ...(group.variations || [])];

        allPieces.forEach(p => {
            if (p.details) {
                p.details.forEach((d: any) => {
                    const hasValue = d.valeur && d.valeur.trim() !== '' && d.valeur !== '-';
                    if (!hasValue) return;

                    // Filtre visibilité
                    if (this.visibleVarianteIds && this.visibleVarianteIds.length > 0) {
                        if (!d.parametre?.id || !this.visibleVarianteIds.includes(d.parametre.id)) return;
                    }

                    const name = d.parametre.nom;
                    if (!map.has(name)) map.set(name, new Set<string>());
                    map.get(name)!.add(d.valeur);
                });
            }
        });

        return Array.from(map.entries()).map(([key, values]) => ({
            key,
            values: Array.from(values)
        }));
    }

    isArray(obj: any): boolean {
        return Array.isArray(obj);
    }

    getUnassignedStock(piece: any): number {
        return piece.quantite || 0;
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

    // --- MULTI-SELECTION LOGIC ---
    togglePieceSelection(id: number | undefined, event: Event): void {
        event.stopPropagation();
        if (id === undefined) return;
        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);
        } else {
            this.selectedIds.add(id);
        }
        this.cdr.detectChanges();
    }

    toggleAllSelection(): void {
        if (this.isAllSelected()) {
            this.selectedIds.clear();
        } else {
            this.filteredPiecesList.forEach(p => {
                if (p.id) this.selectedIds.add(p.id);
            });
        }
        this.cdr.detectChanges();
    }

    isAllSelected(): boolean {
        return this.filteredPiecesList.length > 0 &&
            this.filteredPiecesList.every(p => p.id && this.selectedIds.has(p.id));
    }

    deleteSelectedPieces(): void {
        if (this.selectedIds.size === 0) return;
        this.isBulkDelete = true;
        this.itemToDelete = null;
        this.showDeleteConfirm = true;
        this.cdr.detectChanges();
    }

    startBulkDelete(): void {
        const ids = Array.from(this.selectedIds);
        let successCount = 0;
        let errorCount = 0;
        this.loading = true;

        const processNext = (index: number) => {
            if (index >= ids.length) {
                if (successCount > 0) {
                    this.notify(`${successCount} pièce(s) supprimée(s) avec succès.`, 'success');
                }
                if (errorCount > 0) {
                    this.notify(`${errorCount} pièce(s) n'ont pas pu être supprimées.`, 'error');
                }

                this.selectedIds.clear();
                this.loadPieces(); // Comprehensive reload
                this.cancelDelete();
                this.loading = false;
                this.cdr.detectChanges();
                return;
            }

            const currentId = ids[index];
            this.magasinierService.deletePiece(currentId).subscribe({
                next: () => {
                    successCount++;
                    // Optimistic removal
                    this.pieces = this.pieces.filter(p => p.id !== currentId);
                    this.filteredPiecesList = this.filteredPiecesList.filter(p => p.id !== currentId);
                    processNext(index + 1);
                },
                error: (err) => {
                    errorCount++;
                    processNext(index + 1);
                }
            });
        };

        processNext(0);
    }


}
