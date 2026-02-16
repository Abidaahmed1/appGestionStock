import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { PieceDetachee, ProduitFini } from '../../models/magasinier.models';
import { MagasinierService } from '../../services/magasinier.service';
import { FormsModule } from '@angular/forms';

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
    selectedPiece: PieceDetachee | null = null;
    selectedProduit: ProduitFini | null = null;

    constructor(
        private magasinierService: MagasinierService,
        @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    ngOnInit(): void {
        if (isPlatformBrowser(this.platformId)) {
            this.loadData();
        }
    }

    loadData(): void {
        this.magasinierService.getPieces().subscribe({
            next: (data) => {
                this.pieces = data;
                this.filteredPieces = data;
            },
            error: (err) => console.error('Error loading pieces:', err)
        });

        this.magasinierService.getProduits().subscribe({
            next: (data) => {
                this.produits = data;
                this.filteredProduits = data;
            },
            error: (err) => console.error('Error loading produits:', err)
        });
    }

    switchTab(tab: 'pieces' | 'produits'): void {
        this.activeTab = tab;
        this.selectedPiece = null;
        this.selectedProduit = null;
        this.searchTerm = '';
        this.filterItems();
    }

    filterItems(): void {
        const term = this.searchTerm.toLowerCase();

        if (this.activeTab === 'pieces') {
            this.filteredPieces = this.pieces.filter(piece => {
                if (this.searchCategory === 'all') {
                    return piece.designation.toLowerCase().includes(term) ||
                        piece.reference.toLowerCase().includes(term) ||
                        piece.codeBarre.toLowerCase().includes(term);
                }
                if (this.searchCategory === 'designation') return piece.designation.toLowerCase().includes(term);
                if (this.searchCategory === 'code') return piece.reference.toLowerCase().includes(term) || piece.codeBarre.toLowerCase().includes(term);
                return true;
            });
        } else {
            this.filteredProduits = this.produits.filter(produit => {
                if (this.searchCategory === 'all') {
                    return produit.designation.toLowerCase().includes(term) ||
                        produit.code.toLowerCase().includes(term);
                }
                if (this.searchCategory === 'designation') return produit.designation.toLowerCase().includes(term);
                if (this.searchCategory === 'code') return produit.code.toLowerCase().includes(term);
                return true;
            });
        }
    }

    selectPiece(piece: PieceDetachee): void {
        this.selectedPiece = this.selectedPiece?.id === piece.id ? null : piece;
        this.selectedProduit = null;
    }

    selectProduit(produit: ProduitFini): void {
        this.selectedProduit = this.selectedProduit?.id === produit.id ? null : produit;
        this.selectedPiece = null;
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
}
