import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { PieceDetachee, ProduitFini, DetailPiece } from '../../models/magasinier.models';
import { MagasinierService } from '../../services/magasinier.service';
import { FormsModule } from '@angular/forms';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';
import { Router } from '@angular/router';
import { LogistiqueService } from '../../../logistique/services/logistique.service';
import { StatutCommande, BonCommandeFournisseur } from '../../../logistique/models/logistique.models';
import { KeycloakService } from 'keycloak-angular';

@Component({
    selector: 'app-catalogue-layout',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './catalogue-layout.component.html',
    styleUrls: ['./catalogue-layout.component.css']
})
export class CatalogueLayoutComponent implements OnInit {
    Math = Math;

    pieces: PieceDetachee[] = [];
    produits: ProduitFini[] = [];
    filteredPieces: PieceDetachee[] = [];
    filteredProduits: ProduitFini[] = [];

    activeTab: 'pieces' | 'produits' = 'pieces';
    searchTerm: string = '';
    searchCategory: string = 'all';
    notification: { type: 'success' | 'error', message: string } | null = null;
    showAdvancedFilters: boolean = false;
    filterStockStatus: string = 'all';
    filterCategory: string = 'all';
    minPrice: number | null = null;
    maxPrice: number | null = null;
    categories: string[] = [];
    filterPieceSearch: string = '';
    entreprise: Entreprise | null = null;
    userRoles: string[] = [];

    // Composition Modal
    showCompositionModal = false;
    selectedProduitForComposition: ProduitFini | null = null;
    compositionSearchTerm: string = '';
    filteredCompositionList: PieceDetachee[] = [];

    // Usage Modal
    showUsageModal = false;
    selectedPieceForUsage: PieceDetachee | null = null;
    usageSearchTerm: string = '';
    filteredUsageList: ProduitFini[] = [];




    constructor(
        private magasinierService: MagasinierService,
        private entrepriseService: EntrepriseService,
        private logistiqueService: LogistiqueService,
        private router: Router,
        private keycloak: KeycloakService,
        @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    ngOnInit(): void {
        if (isPlatformBrowser(this.platformId)) {
            this.userRoles = this.keycloak.getUserRoles() || [];
            this.loadData();
            this.loadEntreprise();
        }
    }

    loadData(): void {
        this.magasinierService.getPieces().subscribe({
            next: (data) => {
                this.pieces = data;
                this.extractCategories();
                this.filterItems();
            },
            error: (err) => console.error('Error loading pieces:', err)
        });

        this.magasinierService.getProduits().subscribe({
            next: (data) => {
                this.produits = data;
                this.filterItems();
            },
            error: (err) => console.error('Error loading produits:', err)
        });
    }

    loadEntreprise(): void {
        this.entrepriseService.getCurrentEntreprise().subscribe({
            next: (data) => {
                this.entreprise = data;
            },
            error: (err) => console.error('Erreur chargement entreprise:', err)
        });
    }

    extractCategories(): void {
        const cats = new Set(this.pieces.map(p => p.categorie?.nom).filter(n => !!n));
        this.categories = Array.from(cats as Set<string>).sort();
    }

    switchTab(tab: 'pieces' | 'produits'): void {
        this.activeTab = tab;
        this.resetFilters();
        this.filterItems();
    }

    resetFilters(): void {
        this.searchTerm = '';
        this.filterStockStatus = 'all';
        this.filterCategory = 'all';
        this.minPrice = null;
        this.maxPrice = null;
        this.filterPieceSearch = '';
    }

    toggleAdvancedFilters(): void {
        this.showAdvancedFilters = !this.showAdvancedFilters;
    }

    filterItems(): void {
        const term = this.searchTerm.toLowerCase();

        if (this.activeTab === 'pieces') {
            this.filteredPieces = this.pieces.filter(piece => {
                let matchesSearch = true;
                if (term) {
                    const searchInPiece = (p: PieceDetachee): boolean => {
                        return (p.designation || '').toLowerCase().includes(term) ||
                            (p.reference || '').toLowerCase().includes(term) ||
                            (p.codeBarre || '').toLowerCase().includes(term);
                    };

                    if (this.searchCategory === 'all') {
                        matchesSearch = searchInPiece(piece) ||
                            (piece.variations?.some(v => searchInPiece(v)) ?? false);
                    } else if (this.searchCategory === 'designation') {
                        matchesSearch = (piece.designation || '').toLowerCase().includes(term) ||
                            (piece.variations?.some(v => (v.designation || '').toLowerCase().includes(term)) ?? false);
                    } else if (this.searchCategory === 'code') {
                        matchesSearch = (piece.reference || '').toLowerCase().includes(term) ||
                            (piece.codeBarre || '').toLowerCase().includes(term) ||
                            (piece.variations?.some(v =>
                                (v.reference || '').toLowerCase().includes(term) ||
                                (v.codeBarre || '').toLowerCase().includes(term)
                            ) ?? false);
                    }
                }

                if (!matchesSearch) return false;

                const stockTotal = this.getTotalStock(piece);
                if (this.filterStockStatus === 'available' && stockTotal <= 0) return false;
                if (this.filterStockStatus === 'low' && (stockTotal <= 0 || stockTotal >= piece.seuilMinimum)) return false;
                if (this.filterStockStatus === 'out' && stockTotal > 0) return false;

                if (this.filterCategory !== 'all' && piece.categorie?.nom !== this.filterCategory) return false;

                if (this.minPrice !== null && (piece.prixVente || 0) < this.minPrice) return false;
                if (this.maxPrice !== null && (piece.prixVente || 0) > this.maxPrice) return false;

                return true;
            });
        } else {
            const pSearch = this.filterPieceSearch.toLowerCase();
            this.filteredProduits = this.produits.filter(produit => {
                let matchesSearch = true;
                if (term) {
                    if (this.searchCategory === 'all') {
                        matchesSearch = produit.designation.toLowerCase().includes(term) ||
                            produit.code.toLowerCase().includes(term);
                    } else if (this.searchCategory === 'designation') {
                        matchesSearch = produit.designation.toLowerCase().includes(term);
                    } else if (this.searchCategory === 'code') {
                        matchesSearch = produit.code.toLowerCase().includes(term);
                    }
                }

                if (!matchesSearch) return false;

                if (pSearch) {
                    return produit.pieces?.some(p =>
                        p.designation.toLowerCase().includes(pSearch) ||
                        p.reference.toLowerCase().includes(pSearch)
                    ) || false;
                }

                return true;
            });
        }
    }

    getImageUrl(url: string | null | undefined): string {
        const defaultImage = this.activeTab === 'pieces' ? 'assets/images/default-piece.svg' : 'assets/images/default-produit.svg';
        if (!url) return defaultImage;

        if (url.startsWith('data:image')) return url;
        if (url.startsWith('http')) return url;

        if (!url.includes('/') && url.length > 5) {
            return `http://localhost:8081/api/images/${url}`;
        }

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

    private notify(type: 'success' | 'error', message: string): void {
        this.notification = { type, message };
        if (isPlatformBrowser(this.platformId)) {
            setTimeout(() => {
                this.notification = null;
            }, 3000);
        }
    }

    getTotalStock(piece: PieceDetachee): number {
        return piece.quantite || 0;
    }

    getStockStatus(piece: PieceDetachee): string {
        if (!piece) return 'INCONNU';

        // Otherwise calculate based on total stock and thresholds
        const total = this.getTotalStock(piece);
        if (total <= 0) return 'RUPTURE STOCK';
        if (total < (piece.seuilMinimum || 0)) return 'EN REAPPROVISIONNEMENT';
        return 'DISPONIBLE';
    }



    // ==================== COMPOSITION MODAL ====================
    showProductComposition(produit: ProduitFini): void {
        this.selectedProduitForComposition = produit;
        this.compositionSearchTerm = '';
        this.showCompositionModal = true;
        this.applyCompositionFilter();
    }

    closeCompositionModal(): void {
        this.showCompositionModal = false;
        this.selectedProduitForComposition = null;
        this.filteredCompositionList = [];
    }

    applyCompositionFilter(): void {
        const pieces = this.selectedProduitForComposition?.pieces || [];
        if (!this.compositionSearchTerm) {
            this.filteredCompositionList = pieces;
            return;
        }

        const term = this.compositionSearchTerm.toLowerCase();
        this.filteredCompositionList = pieces.filter(p =>
            p.designation.toLowerCase().includes(term) ||
            p.reference.toLowerCase().includes(term)
        );
    }

    // ==================== USAGE MODAL ====================
    showPieceUsage(piece: PieceDetachee): void {
        console.log('Showing usage for piece:', piece);
        this.selectedPieceForUsage = piece;
        this.usageSearchTerm = '';
        this.showUsageModal = true;
        this.applyUsageFilter();
    }

    closeUsageModal(): void {
        this.showUsageModal = false;
        this.selectedPieceForUsage = null;
        this.filteredUsageList = [];
    }

    applyUsageFilter(): void {
        const produits = this.selectedPieceForUsage?.produitsAssocies || [];
        if (!this.usageSearchTerm) {
            this.filteredUsageList = produits;
            return;
        }

        const term = this.usageSearchTerm.toLowerCase();
        this.filteredUsageList = produits.filter(prod =>
            prod.designation.toLowerCase().includes(term) ||
            prod.code.toLowerCase().includes(term)
        );
    }



    isPiece(item: any): boolean {
        return !!item && 'seuilMinimum' in item;
    }

    getVariantAttributes(piece: PieceDetachee): string[] {
        if (!piece || !piece.details) return [];
        return piece.details
            .filter((d: any) => d.parametre && d.valeur)
            .map((d: any) => `${d.parametre.nom} : ${d.valeur}`);
    }

    hasRole(role: string): boolean {
        if (!this.userRoles || this.userRoles.length === 0) return false;
        const normalize = (r: string) => (r || '').toUpperCase().replace('ROLE_', '').replace(/\s+/g, '_');
        const targetRole = normalize(role);
        return this.userRoles.some(r => normalize(r) === targetRole);
    }

    canOrder(): boolean {
        return this.hasRole('RESPONSABLE_LOGISTIQUE');
    }

    orderPiece(piece: PieceDetachee): void {
        const draft: BonCommandeFournisseur = {
            numeroCmd: 'AUTO',
            dateCmd: new Date().toISOString().substring(0, 16),
            statut: StatutCommande.EN_ATTENTE,
            lignes: [
                {
                    piece: piece,
                    detailPiece: piece.details?.[0], // Re-using detail if available
                    qteCmd: piece.seuilMaximum ? (piece.seuilMaximum - (piece.quantite || 0)) : 10,
                    prixAchat: piece.prixVente || 0, // Placeholder
                    taxe: 19,
                    remise: 0
                }
            ]
        };

        if (draft.lignes![0].qteCmd <= 0) draft.lignes![0].qteCmd = 10;

        this.logistiqueService.commandeDraft = draft;
        this.router.navigate(['/logistique/commandes/nouvelle']);
    }

}
