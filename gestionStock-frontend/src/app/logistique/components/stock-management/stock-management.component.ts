import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeycloakService } from 'keycloak-angular';
import { LogistiqueService } from '../../services/logistique.service';
import { Stock } from '../../models/logistique.models';
import { MagasinierService } from '../../../magasinier/services/magasinier.service';

import { Router } from '@angular/router';

@Component({
    selector: 'app-stock-management',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './stock-management.component.html',
    styleUrl: './stock-management.component.css'
})
export class StockManagementComponent implements OnInit {
    stocks: Stock[] = [];
    pieces: any[] = [];
    lowStockItems: Stock[] = [];

    notification: { message: string, type: 'success' | 'error' } | null = null;
    searchTerm: string = '';
    selectedType: string = '';
    selectedStatus: string = '';
    userRoles: string[] = [];
    showDeleteConfirm = false;
    itemToDelete: any = null;
    showOptionsMenu = false;
    showAdvancedFilter = false;

    filterMinQty: number | null = null;
    filterMaxQty: number | null = null;

    private imageCache = new Map<string, string>();

    columns = [
        { key: 'designation', label: 'Pièce', visible: true, canToggle: false },
        { key: 'reference', label: 'Référence', visible: false, canToggle: true },
        { key: 'quantite', label: 'Quantité', visible: true, canToggle: true },
        { key: 'type', label: 'Type', visible: true, canToggle: true },
        { key: 'seuilMin', label: 'Seuil Min.', visible: true, canToggle: true },
        { key: 'seuilMax', label: 'Seuil Max.', visible: true, canToggle: true }
    ];

    private keycloak = inject(KeycloakService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);
    private router = inject(Router);

    constructor(
        private logistiqueService: LogistiqueService,
        private magasinierService: MagasinierService
    ) { }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.userRoles = this.keycloak.getUserRoles() || [];
            this.loadStocks();
            this.loadPieces();
            this.loadLowStockItems();

            if (typeof window !== 'undefined') {
                window.addEventListener('click', () => {
                    this.showOptionsMenu = false;
                    this.cdr.detectChanges();
                });
            }
            this.cdr.detectChanges();
        }
    }

    hasRole(role: string): boolean {
        const normalize = (r: string) => r.toUpperCase().replace('ROLE_', '').replace(/\s+/g, '_');
        const targetRole = normalize(role);
        return this.userRoles.some(r => normalize(r) === targetRole);
    }

    canManage(): boolean {
        return this.hasRole('MAGASINIER') || this.hasRole('ADMINISTRATEUR');
    }

    isLogistique(): boolean {
        return this.hasRole('RESPONSABLE_LOGISTIQUE');
    }

    showActions(): boolean {
        return this.canManage() || this.isLogistique();
    }

    openNewBon(): void {
        this.router.navigate(['/magasinier/bons/nouveau']);
    }

    loadStocks(): void {
        this.magasinierService.getPieces().subscribe({
            next: (data) => {
                // Map pieces to Stock compatible structures for the view
                this.stocks = data.map(p => ({
                    id: p.id,
                    piece: p,
                    quantite: p.quantite || 0,
                    type: this.calculateStockStatus(p)
                })) as any[];
                this.cdr.detectChanges();
            },
            error: () => {
                this.notify('Erreur lors du chargement des stocks', 'error');
            }
        });
    }

    private calculateStockStatus(p: any): string {
        const qty = p.quantite || 0;
        if (qty <= 0) return 'RUPTURE_STOCK';
        if (qty < (p.seuilMinimum || 0)) return 'EN_REAPPROVISIONNEMENT';
        return 'DISPONIBLE';
    }


    loadPieces(): void {
        this.magasinierService.getPieces().subscribe({
            next: (data) => {
                this.pieces = data || [];
                this.cdr.detectChanges();
            },
            error: () => {
                this.notify('Erreur lors du chargement des pièces', 'error');
            }
        });
    }

    loadLowStockItems(): void {
        this.logistiqueService.getLowStockItems().subscribe({
            next: (data) => {
                this.lowStockItems = data || [];
                this.cdr.detectChanges();
            },
            error: () => {
                console.error('Erreur lors du chargement des alertes de stock');
            }
        });
    }




    confirmDelete(stock: Stock): void {
        this.itemToDelete = stock;
        this.showDeleteConfirm = true;
        this.cdr.detectChanges();
    }

    cancelDelete(): void {
        this.showDeleteConfirm = false;
        this.itemToDelete = null;
        this.cdr.detectChanges();
    }

    deleteStock(id: number): void {
        this.magasinierService.deletePiece(id).subscribe({
            next: () => {
                this.notify('Article archivé', 'success');
                this.loadStocks();
                this.cancelDelete();
            },
            error: (err) => {
                this.notify(err.error?.message || 'Erreur lors de la suppression', 'error');
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
            }, 5000);
        }
    }

    get filteredStocks() {
        return this.stocks.filter(s => {
            const matchesText = !this.searchTerm ||
                s.piece?.designation?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                s.piece?.reference?.toLowerCase().includes(this.searchTerm.toLowerCase());

            const matchesType = !this.selectedType || s.type === this.selectedType;

            const isLow = s.quantite < (s.piece?.seuilMinimum || 0);
            const isRupture = s.quantite <= 0;

            const matchesStatus = !this.selectedStatus ||
                (this.selectedStatus === 'LOW' && isLow) ||
                (this.selectedStatus === 'OK' && !isLow) ||
                (this.selectedStatus === 'RUPTURE' && isRupture);

            const matchesMinQty = this.filterMinQty === null || s.quantite >= this.filterMinQty;
            const matchesMaxQty = this.filterMaxQty === null || s.quantite <= this.filterMaxQty;

            return matchesText && matchesType && matchesStatus && matchesMinQty && matchesMaxQty;
        });
    }

    toggleAdvancedFilter() {
        this.showAdvancedFilter = !this.showAdvancedFilter;
        this.cdr.detectChanges();
    }

    resetAdvancedFilter() {
        this.filterMinQty = null;
        this.filterMaxQty = null;
        this.selectedType = '';
        this.selectedStatus = '';
        this.searchTerm = '';
        this.cdr.detectChanges();
    }

    hasActiveAdvancedFilter(): boolean {
        return !!(this.filterMinQty !== null || this.filterMaxQty !== null || this.selectedType || this.selectedStatus);
    }

    passerCommande(stock: Stock) {
        const draftCommande = {
            dateCmd: new Date().toISOString(),
            statut: 'EN_ATTENTE' as any,
            lignes: [{
                piece: stock.piece,
                qteCmd: stock.piece.seuilMinimum ? (stock.piece.seuilMinimum * 2) : 10, // Suggestion par défaut
                prixAchat: 0
            }]
        };

        this.logistiqueService.commandeDraft = draftCommande as any;
        this.router.navigate(['/logistique/commandes/nouvelle']);
    }

    getStockTypeClass(type: string): string {
        return type ? type.toLowerCase().replace(/_/g, '-') : '';
    }

    toggleOptionsMenu(event: MouseEvent) {
        event.stopPropagation();
        this.showOptionsMenu = !this.showOptionsMenu;
        this.cdr.detectChanges();
    }

    isColumnVisible(key: string): boolean {
        if (!this.columns) return true;
        const col = this.columns.find(c => c.key === key);
        return col ? col.visible : true;
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
        } else if (!url.startsWith('http') && !url.startsWith('assets/')) {
            // Handle case where it's just a filename
            result = `http://localhost:8081/api/images/${url}`;
        }

        this.imageCache.set(url, result);
        return result;
    }
}
