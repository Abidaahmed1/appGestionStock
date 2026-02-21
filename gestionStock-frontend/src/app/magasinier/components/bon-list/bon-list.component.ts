import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeycloakService } from 'keycloak-angular';
import { LogistiqueService } from '../../../logistique/services/logistique.service';
import { Bon, TypeBon, Fournisseur } from '../../../logistique/models/logistique.models';

@Component({
    selector: 'app-bon-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './bon-list.component.html',
    styleUrl: './bon-list.component.css'
})
export class BonListComponent implements OnInit {
    bons: Bon[] = [];
    fournisseurs: Fournisseur[] = [];
    showCreateModal = false;
    selectedBon: Bon | null = null;
    newBon: Bon = this.initNewBon();
    notification: { message: string, type: 'success' | 'error' } | null = null;
    searchTerm: string = '';
    selectedType: TypeBon | null = null;
    userRoles: string[] = [];
    showDeleteConfirm = false;
    itemToDelete: any = null;
    TypeBon = TypeBon;

    private keycloak = inject(KeycloakService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);

    constructor(private logistiqueService: LogistiqueService) { }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.userRoles = this.keycloak.getUserRoles() || [];
            this.loadBons();
            this.loadFournisseurs();
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

    initNewBon(): Bon {
        return {
            numeroBon: 0,
            date: new Date().toISOString().split('T')[0],
            typeBon: TypeBon.ENTREE
        };
    }

    loadBons(): void {
        this.logistiqueService.getAllBons().subscribe({
            next: (data) => {
                this.bons = data || [];
                this.cdr.detectChanges();
            },
            error: () => {
                this.notify('Erreur lors du chargement des bons', 'error');
            }
        });
    }

    loadFournisseurs(): void {
        this.logistiqueService.getAllFournisseurs().subscribe({
            next: (data) => {
                this.fournisseurs = data || [];
                this.cdr.detectChanges();
            },
            error: () => {
                console.error('Erreur lors du chargement des fournisseurs');
            }
        });
    }

    onTypeFilterChange(): void {
        this.loadBons();
    }

    openCreateModal(): void {
        this.selectedBon = null;
        this.newBon = this.initNewBon();
        this.showCreateModal = true;
        this.cdr.detectChanges();
    }

    openEditModal(bon: Bon): void {
        this.selectedBon = bon;
        this.newBon = { ...bon };
        this.showCreateModal = true;
        this.cdr.detectChanges();
    }

    closeCreateModal(): void {
        this.showCreateModal = false;
        this.cdr.detectChanges();
    }

    saveBon(): void {
        if (this.selectedBon && this.selectedBon.id) {
            this.logistiqueService.updateBon(this.selectedBon.id, this.newBon).subscribe({
                next: () => {
                    this.notify('Bon mis à jour', 'success');
                    this.loadBons();
                    this.closeCreateModal();
                },
                error: (err: any) => {
                    const msg = err.error?.message || err.error || 'Erreur lors de la mise à jour';
                    this.notify(msg, 'error');
                }
            });
        } else {
            this.logistiqueService.createBon(this.newBon).subscribe({
                next: () => {
                    this.notify('Bon créé', 'success');
                    this.loadBons();
                    this.closeCreateModal();
                },
                error: (err: any) => {
                    const msg = err.error?.message || err.error || 'Erreur lors de la création';
                    this.notify(msg, 'error');
                }
            });
        }
    }

    confirmDelete(bon: Bon): void {
        this.itemToDelete = bon;
        this.showDeleteConfirm = true;
        this.cdr.detectChanges();
    }

    cancelDelete(): void {
        this.showDeleteConfirm = false;
        this.itemToDelete = null;
        this.cdr.detectChanges();
    }

    deleteBon(id: number): void {
        this.logistiqueService.deleteBon(id).subscribe({
            next: () => {
                this.notify('Bon supprimé', 'success');
                this.loadBons();
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

    get filteredBons() {
        let filtered = this.bons;

        if (this.selectedType) {
            filtered = filtered.filter(b => b.typeBon === this.selectedType);
        }

        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(b =>
                b.numeroBon?.toString().includes(term) ||
                b.fournisseur?.code?.toLowerCase().includes(term)
            );
        }

        return filtered;
    }

    getTypeBadgeClass(type: TypeBon): string {
        switch (type) {
            case TypeBon.ENTREE: return 'entree';
            case TypeBon.SORTIE: return 'sortie';
            case TypeBon.RETOUR: return 'retour';
            default: return '';
        }
    }
}
