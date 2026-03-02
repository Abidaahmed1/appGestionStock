import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { PieceDetachee, ProduitFini } from '../../models/magasinier.models';
import { MagasinierService } from '../../services/magasinier.service';
import { FormsModule } from '@angular/forms';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';

@Component({
    selector: 'app-catalogue-layout',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './catalogue-layout.component.html',
    styleUrls: ['./catalogue-layout.component.css']
})
export class CatalogueLayoutComponent implements OnInit {
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

    constructor(
        private magasinierService: MagasinierService,
        private entrepriseService: EntrepriseService,
        @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    ngOnInit(): void {
        if (isPlatformBrowser(this.platformId)) {
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
        this.entrepriseService.getAllEntreprises().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                    this.entreprise = data[0];
                }
            }
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
                // Search term filter
                let matchesSearch = true;
                if (term) {
                    if (this.searchCategory === 'all') {
                        matchesSearch = piece.designation.toLowerCase().includes(term) ||
                            piece.reference.toLowerCase().includes(term) ||
                            (piece.codeBarre?.toLowerCase().includes(term) || false);
                    } else if (this.searchCategory === 'designation') {
                        matchesSearch = piece.designation.toLowerCase().includes(term);
                    } else if (this.searchCategory === 'code') {
                        matchesSearch = piece.reference.toLowerCase().includes(term) ||
                            (piece.codeBarre?.toLowerCase().includes(term) || false);
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
        if (piece.stocks && Array.isArray(piece.stocks)) {
            return piece.stocks.reduce((sum: number, s: any) => sum + (s.quantite || 0), 0);
        }
        return 0;
    }

    getStockStatus(piece: PieceDetachee): string {
        let status = 'INCONNU';
        if (piece.stocks && piece.stocks.length > 0) {
            status = piece.stocks[0].type || 'INCONNU';
        }
        return status.replace(/_/g, ' ');
    }
}
