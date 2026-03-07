import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LogistiqueService } from '../../logistique/services/logistique.service';
import { Bon } from '../../logistique/models/logistique.models';
import { EntrepriseService } from '../../admin/services/entreprise.service';
import { Entreprise } from '../../admin/models/entreprise.model';

@Component({
    selector: 'app-bon-history',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './bon-history.component.html',
    styleUrl: './bon-history.component.css'
})
export class BonHistoryComponent implements OnInit {
    archivedBons: Bon[] = [];
    filteredBons: Bon[] = [];
    searchTerm: string = '';
    notification: { message: string, type: 'success' | 'error' } | null = null;
    showReactivateConfirm = false;
    bonToReactivate: Bon | null = null;
    loading = false;
    entreprise: Entreprise | null = null;

    // Advanced filters
    showAdvancedFilter = false;
    filterType: string = '';
    filterDateFrom: string = '';
    filterDateTo: string = '';
    filterCreateur: string = '';

    // Column visibility
    showOptionsMenu = false;
    columns = [
        { key: 'reference', label: 'Référence', visible: true, canToggle: false },
        { key: 'type', label: 'Type', visible: true, canToggle: true },
        { key: 'createur', label: 'Créateur', visible: true, canToggle: true },
        { key: 'fournisseur', label: 'Fournisseur', visible: true, canToggle: true },
        { key: 'date', label: "Date d'origine", visible: true, canToggle: true },
        { key: 'montant', label: 'Montant TTC', visible: true, canToggle: true },
        { key: 'statut', label: 'Statut', visible: true, canToggle: true },
        { key: 'actions', label: 'Actions', visible: true, canToggle: false },
    ];

    readonly typeOptions = [
        { value: '', label: 'Tous les types' },
        { value: 'ENTREE', label: 'Entrée' },
        { value: 'SORTIE', label: 'Sortie' },
        { value: 'RETOUR', label: 'Retour' },
    ];

    private logistiqueService = inject(LogistiqueService);
    private router = inject(Router);
    private entrepriseService = inject(EntrepriseService);

    ngOnInit(): void {
        this.loadHistory();
        this.loadEntreprise();
    }

    loadHistory(): void {
        this.loading = true;
        this.logistiqueService.getBonsHistory().subscribe({
            next: (data: Bon[]) => {
                this.archivedBons = data;
                this.applyFilters();
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading bon history', err);
                this.loading = false;
            }
        });
    }

    loadEntreprise(): void {
        this.entrepriseService.getCurrentEntreprise().subscribe({
            next: (data) => {
                this.entreprise = data;
            },
            error: () => {
                // Fallback: prendre la première entreprise si /current n'est pas disponible
                this.entrepriseService.getAllEntreprises().subscribe({
                    next: (list) => {
                        if (list && list.length > 0) {
                            this.entreprise = list[0];
                        }
                    }
                });
            }
        });
    }

    applyFilters(): void {
        this.filteredBons = this.archivedBons.filter(b => {
            const term = this.searchTerm.toLowerCase();
            const matchesSearch = !this.searchTerm ||
                b.numeroBon?.toLowerCase().includes(term) ||
                b.createur?.firstName?.toLowerCase().includes(term) ||
                b.createur?.lastName?.toLowerCase().includes(term) ||
                b.fournisseur?.nom?.toLowerCase().includes(term);

            const matchesType = !this.filterType || b.typeBon === this.filterType;

            const matchesCreateur = !this.filterCreateur ||
                `${b.createur?.firstName} ${b.createur?.lastName}`.toLowerCase()
                    .includes(this.filterCreateur.toLowerCase());

            const bDate = b.date ? new Date(b.date) : null;
            const matchesDateFrom = !this.filterDateFrom || (bDate && bDate >= new Date(this.filterDateFrom));
            const matchesDateTo = !this.filterDateTo || (bDate && bDate <= new Date(this.filterDateTo + 'T23:59:59'));

            return matchesSearch && matchesType && matchesCreateur && matchesDateFrom && matchesDateTo;
        }).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }

    resetAdvancedFilter(): void {
        this.filterType = '';
        this.filterDateFrom = '';
        this.filterDateTo = '';
        this.filterCreateur = '';
        this.applyFilters();
    }

    hasActiveAdvancedFilter(): boolean {
        return !!(this.filterType || this.filterDateFrom || this.filterDateTo || this.filterCreateur);
    }

    isColumnVisible(key: string): boolean {
        return this.columns.find(c => c.key === key)?.visible ?? true;
    }

    toggleOptionsMenu(event: MouseEvent): void {
        event.stopPropagation();
        this.showOptionsMenu = !this.showOptionsMenu;
    }

    viewDetails(bon: Bon): void {
        this.router.navigate(['/magasinier/bons', bon.id]);
    }

    reactivate(bon: Bon): void {
        this.bonToReactivate = bon;
        this.showReactivateConfirm = true;
    }

    cancelReactivate(): void {
        this.showReactivateConfirm = false;
        this.bonToReactivate = null;
    }

    confirmReactivate(): void {
        if (!this.bonToReactivate?.id) return;

        this.logistiqueService.reactivateBon(this.bonToReactivate.id).subscribe({
            next: () => {
                this.notify('Le bon a été réactivé avec succès.', 'success');
                this.showReactivateConfirm = false;
                this.bonToReactivate = null;
                this.loadHistory();
            },
            error: (err) => {
                console.error('Error reactivating bon', err);
                this.notify('Erreur lors de la réactivation du bon.', 'error');
                this.showReactivateConfirm = false;
                this.bonToReactivate = null;
            }
        });
    }

    notify(message: string, type: 'success' | 'error'): void {
        this.notification = { message, type };
        setTimeout(() => this.notification = null, 5000);
    }

    getTypeLabel(type: string): string {
        switch (type) {
            case 'ENTREE': return 'Entrée';
            case 'SORTIE': return 'Sortie';
            case 'RETOUR': return 'Retour';
            default: return type;
        }
    }

    getTypeBadgeClass(type: string): string {
        switch (type) {
            case 'ENTREE': return 'status-pill--recue';
            case 'SORTIE': return 'status-pill--annulee';
            case 'RETOUR': return 'status-pill--brouillon';
            default: return '';
        }
    }

    getGrandTotalTTC(bon: Bon): number {
        if (!bon.mouvement || !bon.mouvement.montantTTC) return 0;
        return bon.mouvement.montantTTC;
    }

    getCreateurInitials(bon: Bon): string {
        const first = bon.createur?.firstName?.charAt(0) || '';
        return (first).toUpperCase() || '?';
    }
}
