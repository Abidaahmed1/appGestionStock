import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { KeycloakService } from 'keycloak-angular';
import { MagasinierService } from '../../services/magasinier.service';
import { ProduitFini, PieceDetachee } from '../../models/magasinier.models';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'app-produit-list',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmDialogComponent],
    templateUrl: './produit-list.component.html',
    styleUrl: './produit-list.component.css'
})
export class ProduitListComponent implements OnInit {
    produits: ProduitFini[] = [];
    showCreateModal = false;
    selectedProduit: ProduitFini | null = null;
    newProduit: ProduitFini = this.initNewProduit();
    notification: { message: string, type: 'success' | 'error' } | null = null;
    parametres: any = null;
    searchTerm: string = '';
    searchCategory: string = 'all';
    entreprise: Entreprise | null = null;
    userRoles: string[] = [];
    selectedFile: File | null = null;
    imagePreview: string | null = null;
    showDeleteConfirm = false;
    itemToDelete: any = null;
    isAutoCode = true;
    lastUpdateTimestamp = Date.now();
    showSaveConfirm = false;
    @ViewChild('produitForm') produitForm!: NgForm;
    submitted = false;



    showAssociatedPiecesModal = false;
    selectedProductForPieces: ProduitFini | null = null;
    associatedPiecesSearchTerm: string = '';

    showAdvancedFilters = false;
    minPrice: number | null = null;
    maxPrice: number | null = null;
    sortBy: string = 'name_asc';
    selectedCategory: string = 'all';

    private keycloak = inject(KeycloakService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);
    private entrepriseService = inject(EntrepriseService);

    constructor(private magasinierService: MagasinierService) { }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.userRoles = this.keycloak.getUserRoles() || [];
            this.cdr.detectChanges();
            this.loadProduits();
            this.loadEntreprise();
            this.loadParametres();
        }
    }

    loadParametres() {
        this.magasinierService.getAllParametres().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                    this.parametres = data[0];
                    this.cdr.detectChanges();
                }
            },
            error: (err) => console.error('Erreur chargement paramètres:', err)
        });
    }

    isModuleAuto(moduleName: string): boolean {
        if (!this.parametres?.numerotationConfigs) return true;
        const config = this.parametres.numerotationConfigs.find((c: any) => c.module === moduleName);
        return config ? config.automatique !== false : true;
    }


    getPrefix(moduleName: string): string {
        if (!this.parametres?.numerotationConfigs) return '';
        const config = this.parametres.numerotationConfigs.find((c: any) => c.module === moduleName);
        let prefix = config?.prefix || '';
        if (prefix) {
            const date = new Date();
            prefix = prefix
                .replace('%YYYY%', date.getFullYear().toString())
                .replace('%YY%', date.getFullYear().toString().substring(2))
                .replace('%MM%', (date.getMonth() + 1).toString().padStart(2, '0'))
                .replace('%DD%', date.getDate().toString().padStart(2, '0'));
        }
        return prefix;
    }


    getFormatExplanation(moduleName: string): string {
        const config = this.parametres?.numerotationConfigs?.find((c: any) => c.module === moduleName);
        const prefix = config?.prefix || '';

        let parts = [];
        if (prefix.includes('%YYYY%')) parts.push("l'année sur 4 chiffres");
        else if (prefix.includes('%YY%')) parts.push("l'année sur 2 chiffres");

        if (prefix.includes('%MM%')) parts.push("le mois sur 2 chiffres");
        if (prefix.includes('%DD%')) parts.push("le jour sur 2 chiffres");

        if (parts.length > 0) {
            return `Astuce : Le numéro inclut ${parts.join(', ')} suivis d'une séquence.`;
        }
        return 'Séquence simple (sans date)';
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

    initNewProduit(): ProduitFini {
        return {
            code: 'AUTO',
            designation: '',
            pieces: [],
            estArchivee: false,
            imageUrl: ''
        };
    }

    get currencySymbol(): string {
        return this.entrepriseService.getDeviseSymbol(this.entreprise);
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            this.selectedFile = input.files[0];
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.imagePreview = e.target.result;
                this.cdr.detectChanges(); // Force l'affichage immédiat de l'aperçu dans la modale
            };
            reader.readAsDataURL(this.selectedFile);
        }
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

        // Mise à jour locale ultra-rapide (Optimistic UI) 
        const index = this.produits.findIndex(p => p.id === id);
        if (index !== -1 && this.imagePreview) {
            this.produits[index].imageUrl = this.imagePreview; // On injecte le Base64 directement
            this.cdr.detectChanges();
        }

        this.magasinierService.uploadProduitImage(id, formData).subscribe({
            next: (updatedProduit) => {
                this.lastUpdateTimestamp = Date.now();

                // On met à jour l'objet local SANS recharger toute la liste
                if (index !== -1) {
                    this.produits[index] = { ...updatedProduit };
                }

                if (this.selectedProduit?.id === id) {
                    this.selectedProduit = updatedProduit;
                }

                this.notify(successMessage, 'success');
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error uploading image:', err);
                this.notify('Erreur lors de l\'upload, mais les données sont sauvées', 'error');
                this.loadProduits(); // En cas d'erreur seulement, on recharge pour restaurer l'état
            }
        });
    }



    loadProduits(): void {
        this.magasinierService.getProduits().subscribe({
            next: (data) => {
                this.produits = data || [];
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.notify('Erreur lors du chargement des produits', 'error');
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
            error: (err) => console.error('Erreur chargement entreprise:', err)
        });
    }

    openCreateModal(): void {
        this.selectedProduit = null;
        this.isAutoCode = this.isModuleAuto('PRODUIT');
        this.newProduit = this.initNewProduit();
        this.newProduit.code = this.isAutoCode ? 'AUTO' : '';
        this.selectedFile = null;
        this.imagePreview = null;
        this.submitted = false;
        this.showCreateModal = true;
        this.cdr.detectChanges();
    }

    openEditModal(produit: ProduitFini): void {
        this.selectedProduit = produit;
        this.newProduit = { ...produit };
        this.selectedFile = null;
        this.imagePreview = produit.imageUrl || null;
        this.isAutoCode = this.newProduit.code === 'AUTO';
        this.submitted = false;
        this.showCreateModal = true;
        this.cdr.detectChanges();
    }

    toggleAutoCode(val: boolean): void {
        this.isAutoCode = val;
        if (val) {
            this.newProduit.code = 'AUTO';
        } else if (this.newProduit.code === 'AUTO') {
            this.newProduit.code = '';
        }
        this.cdr.detectChanges();
    }

    closeCreateModal(): void {
        this.showCreateModal = false;
        this.cdr.detectChanges();
    }

    saveProduit(): void {
        this.submitted = true;
        if (this.produitForm.invalid) return;

        const isDirty = this.produitForm?.dirty || !!this.selectedFile;

        if (!isDirty && this.selectedProduit) {
            this.closeCreateModal();
            return;
        }

        this.showSaveConfirm = true;
        this.cdr.detectChanges();
    }

    onConfirmSave(): void {
        this.showSaveConfirm = false;
        const payload: any = { ...this.newProduit };
        delete payload.pieces;
        delete payload.entreprise;

        // --- PHASE 1 : RÉACTION VISUELLE IMMÉDIATE ---
        if (this.selectedProduit?.id && this.selectedFile && this.imagePreview) {
            const index = this.produits.findIndex(p => p.id === this.selectedProduit?.id);
            if (index !== -1) {
                // Remplacement immédiat par l'image locale (Base64) dans la liste
                this.produits[index].imageUrl = this.imagePreview;
                this.cdr.detectChanges();
            }
        }

        // Fermeture instantanée pour libérer l'utilisateur
        this.closeCreateModal();

        // --- PHASE 2 : EXÉCUTION RÉELLE (PARALLÈLE POUR UPDATE) ---
        if (this.selectedProduit && this.selectedProduit.id) {
            const prodId = this.selectedProduit.id;

            // On lance l'upload de l'image SANS attendre la mise à jour des données
            if (this.selectedFile) {
                this.doUpload(this.selectedFile, prodId, 'Image mise à jour');
            }

            // En parallèle, on met à jour les informations (Désignation, etc.)
            this.magasinierService.updateProduit(prodId, payload).subscribe({
                next: () => {
                    this.notify('Informations mises à jour', 'success');
                    this.loadProduits(); // Conserve la cohérence globale
                },
                error: (err) => this.notify(this.extractErrorMessage(err, 'Erreur de mise à jour'), 'error')
            });
        } else {
            // Création : On doit d'abord avoir l'ID généré pour pouvoir uploader
            this.magasinierService.createProduit(payload).subscribe({
                next: (saved) => {
                    if (this.selectedFile && saved.id) {
                        this.doUpload(this.selectedFile, saved.id, 'Produit créé');
                    } else {
                        this.notify('Produit créé', 'success');
                        this.loadProduits();
                    }
                },
                error: (err) => this.notify(this.extractErrorMessage(err, 'Erreur de création'), 'error')
            });
        }
    }

    onCancelSave(): void {
        this.showSaveConfirm = false;
        this.cdr.detectChanges();
    }




    confirmDelete(produit: ProduitFini): void {
        if (!this.canArchiveProduit(produit)) {
            this.notify("Impossible de supprimer un produit fini contenant des pièces.", 'error');
            return;
        }
        this.itemToDelete = produit;
        this.showDeleteConfirm = true;
        this.cdr.detectChanges();
    }

    cancelDelete(): void {
        this.showDeleteConfirm = false;
        this.itemToDelete = null;
        this.cdr.detectChanges();
    }

    deleteProduit(id: number): void {
        this.magasinierService.deleteProduit(id).subscribe({
            next: () => {
                this.notify('Produit archivé avec succès', 'success');
                this.loadProduits();
                this.cancelDelete();
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error deleting product:', err);
                const msg = this.extractErrorMessage(err, 'Erreur lors de l\'archivage du produit.');
                this.notify(msg, 'error');
                this.cdr.detectChanges();
            }
        });
    }

    notify(message: string, type: 'success' | 'error'): void {
        this.notification = { message, type };
        this.cdr.detectChanges();
        if (isPlatformBrowser(this.platformId)) {
            setTimeout(() => {
                this.notification = null;
                this.cdr.detectChanges();
            }, 6000);
        }
    }

    /**
     * Extracts a user-friendly error message from an HTTP error.
     * Avoids exposing raw technical/JSON errors to the user.
     */
    extractErrorMessage(err: any, defaultMsg: string): string {
        // If there's a clean backend message, use it
        if (typeof err.error === 'object' && err.error !== null) {
            const m = err.error?.message || err.error?.error || err.error?.detail;
            if (m && typeof m === 'string' && m.length < 300 && !m.includes('com.') && !m.includes('java.')) {
                return m;
            }
        }
        // String body - only use if short and human readable
        if (typeof err.error === 'string' && err.error.length < 250
            && !err.error.includes('com.') && !err.error.includes('at ')) {
            return err.error;
        }
        // HTTP status fallbacks
        if (err.status === 400) return 'Données invalides. Veuillez vérifier les champs saisis.';
        if (err.status === 409) return 'Ce code existe déjà. Veuillez en choisir un autre.';
        if (err.status === 404) return 'Produit introuvable.';
        if (err.status === 500) return 'Une erreur serveur est survenue. Veuillez réessayer.';
        return defaultMsg;
    }


    getImageUrl(url: string | null | undefined): string {
        if (!url) return '/assets/images/default-produit.png';

        // Si c'est une prévisualisation locale (Base64), on la retourne directement
        if (url.startsWith('data:')) return url;

        let finalUrl = url;
        if (url.startsWith('/api/images') || url.startsWith('/uploads')) {
            finalUrl = `http://localhost:8095${url}`;
        } else if (url.includes('/remote.php/dav/files/')) {
            const parts = url.split('/');
            const filename = parts[parts.length - 1];
            finalUrl = `http://localhost:8095/api/images/${filename}`;
        }

        // Ajout d'un paramètre de version pour forcer le rafraîchissement du cache
        const separator = finalUrl.includes('?') ? '&' : '?';
        return `${finalUrl}${separator}v=${this.lastUpdateTimestamp}`;
    }


    canArchiveProduit(produit: ProduitFini): boolean {
        return !produit.pieces || produit.pieces.length === 0;
    }



    get filteredProduits() {
        if (!this.searchTerm) return this.produits;
        const term = this.searchTerm.toLowerCase();
        return (this.produits || []).filter(p => {
            if (this.searchCategory === 'all') {
                const matchesBasic = (p.designation || '').toLowerCase().includes(term) ||
                    (p.code || '').toLowerCase().includes(term);
                const matchesPiece = p.pieces?.some(piece =>
                    (piece.designation || '').toLowerCase().includes(term) ||
                    (piece.reference || '').toLowerCase().includes(term) ||
                    (piece.codeBarre || '').toLowerCase().includes(term) ||
                    (piece.variations?.some(v => (v.codeBarre || '').toLowerCase().includes(term)) ?? false)
                );
                return matchesBasic || matchesPiece;
            }
            if (this.searchCategory === 'code') return (p.code || '').toLowerCase().includes(term);
            if (this.searchCategory === 'designation') return (p.designation || '').toLowerCase().includes(term);
            if (this.searchCategory === 'piece') {
                return p.pieces?.some(piece =>
                    (piece.designation || '').toLowerCase().includes(term) ||
                    (piece.reference || '').toLowerCase().includes(term) ||
                    (piece.codeBarre || '').toLowerCase().includes(term) ||
                    (piece.variations?.some(v => (v.codeBarre || '').toLowerCase().includes(term)) ?? false)
                );
            }
            return true;
        });
    }


    showAssociatedPieces(produit: ProduitFini): void {
        console.log('Ouverture des pièces pour le produit:', produit.designation, 'ID:', produit.id);
        this.selectedProductForPieces = produit;
        this.showAssociatedPiecesModal = true;
        this.cdr.detectChanges();
    }

    get filteredAssociatedPieces(): PieceDetachee[] {
        let pieces = [...(this.selectedProductForPieces?.pieces || [])];

        // Search term filter
        if (this.associatedPiecesSearchTerm) {
            const term = this.associatedPiecesSearchTerm.toLowerCase();
            pieces = pieces.filter(p =>
                (p.designation || '').toLowerCase().includes(term) ||
                (p.reference || '').toLowerCase().includes(term) ||
                (p.codeBarre || '').toLowerCase().includes(term) ||
                (p.variations?.some(v => (v.codeBarre || '').toLowerCase().includes(term)) ?? false)
            );
        }

        // Price range filter
        if (this.minPrice !== null) {
            pieces = pieces.filter(p => p.prixVente >= (this.minPrice || 0));
        }
        if (this.maxPrice !== null) {
            pieces = pieces.filter(p => p.prixVente <= (this.maxPrice || Infinity));
        }

        // Category filter
        if (this.selectedCategory !== 'all') {
            pieces = pieces.filter(p => p.categorie?.nom === this.selectedCategory);
        }

        // Sorting logic
        pieces.sort((a, b) => {
            switch (this.sortBy) {
                case 'name_asc':
                    return (a.designation || '').localeCompare(b.designation || '');
                case 'name_desc':
                    return (b.designation || '').localeCompare(a.designation || '');
                case 'price_asc':
                    return (a.prixVente || 0) - (b.prixVente || 0);
                case 'price_desc':
                    return (b.prixVente || 0) - (a.prixVente || 0);
                case 'ref_asc':
                    return (a.reference || '').localeCompare(b.reference || '');
                default:
                    return 0;
            }
        });

        return pieces;
    }

    get uniqueCategories(): string[] {
        const cats = new Set<string>();
        this.selectedProductForPieces?.pieces?.forEach(p => {
            if (p.categorie?.nom) cats.add(p.categorie.nom);
        });
        return Array.from(cats);
    }

    toggleAdvancedFilters(): void {
        this.showAdvancedFilters = !this.showAdvancedFilters;
        this.cdr.detectChanges();
    }

    resetFilters(): void {
        this.associatedPiecesSearchTerm = '';
        this.minPrice = null;
        this.maxPrice = null;
        this.sortBy = 'name_asc';
        this.selectedCategory = 'all';
        this.cdr.detectChanges();
    }

    closeAssociatedPiecesModal(): void {
        this.showAssociatedPiecesModal = false;
        this.selectedProductForPieces = null;
        this.associatedPiecesSearchTerm = '';
        this.cdr.detectChanges();
    }



    triggerChangeDetection(): void {
        this.cdr.detectChanges();
    }
}
