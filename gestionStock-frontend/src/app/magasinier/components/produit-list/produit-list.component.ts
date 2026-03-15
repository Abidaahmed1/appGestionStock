import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeycloakService } from 'keycloak-angular';
import { MagasinierService } from '../../services/magasinier.service';
import { ProduitFini, PieceDetachee } from '../../models/magasinier.models';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';

@Component({
    selector: 'app-produit-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
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


    showAssociatedPiecesModal = false;
    selectedProductForPieces: ProduitFini | null = null;
    associatedPiecesSearchTerm: string = '';

    // Advanced Filters State
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
        const config = this.parametres?.numerotationConfigs?.find((c: any) => c.module === moduleName);
        return config ? config.automatique !== false : true;
    }

    getPrefix(moduleName: string): string {
        const config = this.parametres?.numerotationConfigs?.find((c: any) => c.module === moduleName);
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

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            this.selectedFile = input.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                this.imagePreview = reader.result as string;
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

        this.magasinierService.uploadProduitImage(id, formData).subscribe({
            next: (updatedProduit) => {
                this.notify(successMessage, 'success');
                this.loadProduits();
                if (this.selectedProduit?.id === id) {
                    this.selectedProduit = updatedProduit;
                }
            },
            error: (err) => {
                console.error('Error uploading produit image:', err);
                this.notify('Erreur lors du chargement de l\'image', 'error');
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
        this.showCreateModal = true;
        this.cdr.detectChanges();
    }

    openEditModal(produit: ProduitFini): void {
        this.selectedProduit = produit;
        this.newProduit = { ...produit };
        this.selectedFile = null;
        this.imagePreview = produit.imageUrl || null;
        this.isAutoCode = this.newProduit.code === 'AUTO';
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
        const payload: any = { ...this.newProduit };
        delete payload.pieces;
        delete payload.entreprise;

        if (this.selectedProduit && this.selectedProduit.id) {
            this.magasinierService.updateProduit(this.selectedProduit.id, payload).subscribe({
                next: (saved) => {
                    if (this.selectedFile && saved.id) {
                        this.doUpload(this.selectedFile, saved.id, 'Produit mis à jour');
                    } else {
                        this.notify('Produit mis à jour', 'success');
                        this.loadProduits();
                    }
                    this.closeCreateModal();
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    const msg = this.extractErrorMessage(err, 'Erreur lors de la mise à jour du produit.');
                    this.notify(msg, 'error');
                    this.cdr.detectChanges();
                }
            });
        } else {
            this.magasinierService.createProduit(payload).subscribe({
                next: (saved) => {
                    if (this.selectedFile && saved.id) {
                        this.doUpload(this.selectedFile, saved.id, 'Produit créé');
                    } else {
                        this.notify('Produit créé', 'success');
                        this.loadProduits();
                    }
                    this.closeCreateModal();
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    const msg = this.extractErrorMessage(err, 'Erreur lors de la création du produit.');
                    this.notify(msg, 'error');
                    this.cdr.detectChanges();
                }
            });
        }
    }

    confirmDelete(produit: ProduitFini): void {
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
        if (!url) return 'assets/images/default-produit.svg';

        if (url.startsWith('/api/images') || url.startsWith('/uploads')) {
            return `http://localhost:8081${url}`;
        }

        if (url.includes('/remote.php/dav/files/')) {
            const parts = url.split('/');
            const filename = parts[parts.length - 1];
            return `http://localhost:8081/api/images/${filename}`;
        }

        return url;
    }

    canArchiveProduit(produit: ProduitFini): boolean {
        if (!produit.pieces || produit.pieces.length === 0) return true;
        return produit.pieces.every(p => p.archivee);
    }

    get filteredProduits() {
        if (!this.searchTerm) return this.produits;
        const term = this.searchTerm.toLowerCase();
        return (this.produits || []).filter(p => {
            if (this.searchCategory === 'all') {
                const matchesBasic = (p.designation || '').toLowerCase().includes(term) ||
                    (p.code || '').toLowerCase().includes(term);
                const matchesPiece = p.pieces?.some(piece =>
                    piece.designation.toLowerCase().includes(term) ||
                    piece.reference.toLowerCase().includes(term) ||
                    (piece.details?.some(d => (d.codeBarre || '').toLowerCase().includes(term)) ?? false)
                );
                return matchesBasic || matchesPiece;
            }
            if (this.searchCategory === 'code') return (p.code || '').toLowerCase().includes(term);
            if (this.searchCategory === 'designation') return (p.designation || '').toLowerCase().includes(term);
            if (this.searchCategory === 'piece') {
                return p.pieces?.some(piece =>
                    piece.designation.toLowerCase().includes(term) ||
                    piece.reference.toLowerCase().includes(term) ||
                    (piece.details?.some(d => (d.codeBarre || '').toLowerCase().includes(term)) ?? false)
                );
            }
            return true;
        });
    }


    showAssociatedPieces(produit: ProduitFini): void {
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
                p.details?.some(d => (d.codeBarre || '').toLowerCase().includes(term))
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
