import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeycloakService } from 'keycloak-angular';
import { LogistiqueService } from '../../services/logistique.service';
import { Stock } from '../../models/logistique.models';
import { MagasinierService } from '../../../magasinier/services/magasinier.service';

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
    showCreateModal = false;
    selectedStock: Stock | null = null;
    newStock: Stock = this.initNewStock();
    notification: { message: string, type: 'success' | 'error' } | null = null;
    searchTerm: string = '';
    userRoles: string[] = [];
    showDeleteConfirm = false;
    itemToDelete: any = null;

    private keycloak = inject(KeycloakService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);

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

    initNewStock(): Stock {
        return {
            piece: null,
            quantite: 0,
            type: 'DISPONIBLE' as any
        };
    }

    loadStocks(): void {
        this.logistiqueService.getAllStocks().subscribe({
            next: (data) => {
                this.stocks = data || [];
                this.cdr.detectChanges();
            },
            error: () => {
                this.notify('Erreur lors du chargement des stocks', 'error');
            }
        });
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


    openCreateModal(): void {
        this.selectedStock = null;
        this.newStock = this.initNewStock();
        this.showCreateModal = true;
        this.cdr.detectChanges();
    }

    openEditModal(stock: Stock): void {
        this.selectedStock = stock;
        this.newStock = { ...stock };
        this.showCreateModal = true;
        this.cdr.detectChanges();
    }

    closeCreateModal(): void {
        this.showCreateModal = false;
        this.cdr.detectChanges();
    }

    saveStock(): void {
        if (this.selectedStock && this.selectedStock.id) {
            this.logistiqueService.updateStock(this.selectedStock.id, this.newStock).subscribe({
                next: () => {
                    this.notify('Stock mis à jour', 'success');
                    this.loadStocks();
                    this.closeCreateModal();
                },
                error: () => {
                    this.notify('Erreur lors de la mise à jour', 'error');
                }
            });
        } else {
            this.logistiqueService.createStock(this.newStock).subscribe({
                next: () => {
                    this.notify('Stock créé', 'success');
                    this.loadStocks();
                    this.closeCreateModal();
                },
                error: () => {
                    this.notify('Erreur lors de la création', 'error');
                }
            });
        }
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
        this.logistiqueService.deleteStock(id).subscribe({
            next: () => {
                this.notify('Stock supprimé', 'success');
                this.loadStocks();
                this.cancelDelete();
            },
            error: () => {
                this.notify('Erreur lors de la suppression', 'error');
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
        if (!this.searchTerm) return this.stocks;
        const term = this.searchTerm.toLowerCase();
        return this.stocks.filter(s =>
            s.piece?.designation?.toLowerCase().includes(term) ||
            s.piece?.reference?.toLowerCase().includes(term)
        );
    }
}
