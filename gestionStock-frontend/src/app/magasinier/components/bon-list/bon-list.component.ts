import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeycloakService } from 'keycloak-angular';
import { LogistiqueService } from '../../../logistique/services/logistique.service';
import { Bon, TypeBon, Fournisseur } from '../../../logistique/models/logistique.models';
import { Router } from '@angular/router';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';

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
    entreprise: Entreprise | null = null;
    pieces: any[] = [];
    filterPieceId: number | null = null;
    searchTermPiece: string = '';
    showPieceDropdown = false;
    searchTermFournisseur: string = '';
    showFournisseurDropdown = false;


    showOptionsMenu = false;
    showAdvancedFilter = false;
    userRoles: string[] = [];
    showDeleteConfirm = false;
    isBulkDelete = false;
    itemToDelete: any = null;
    selectedBonIds: Set<number> = new Set();
    TypeBon = TypeBon;

    filterType: TypeBon | null = null;
    filterFournisseurId: number | null = null;
    filterDateFrom: string = '';
    filterDateTo: string = '';
    filterMontantMin: number | null = null;
    filterMontantMax: number | null = null;

    columns = [
        { label: 'Référence', key: 'numeroBon', visible: true, canToggle: false },
        { label: 'Type Bon', key: 'type', visible: false, canToggle: true },
        { label: 'Mouvement', key: 'typeMouvement', visible: true, canToggle: true },
        { label: 'Fournisseur', key: 'fournisseur', visible: false, canToggle: true },
        { label: 'Créateur', key: 'createur', visible: true, canToggle: true },
        { label: 'Date', key: 'date', visible: true, canToggle: true },
        { label: 'Montant HT', key: 'montantHT', visible: false, canToggle: true },
        { label: 'Montant TTC', key: 'montantTTC', visible: true, canToggle: true }
    ];

    private keycloak = inject(KeycloakService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);
    private router = inject(Router);
    private entrepriseService = inject(EntrepriseService);

    get currencySymbol(): string {
        return this.entrepriseService.getDeviseSymbol(this.entreprise);
    }

    constructor(private logistiqueService: LogistiqueService) { }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.userRoles = this.keycloak.getUserRoles();
            this.loadBons();
            this.loadFournisseurs();
            this.loadPieces();
            this.loadEntreprise();
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
            numeroBon: '',
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

    loadPieces(): void {
        this.logistiqueService.getAllStocks().subscribe({
            next: (data) => {
                this.pieces = data || [];
                this.cdr.detectChanges();
            },
            error: () => {
                console.error('Erreur lors du chargement des pièces');
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
        this.router.navigate(['/magasinier/bons/nouveau']);
    }

    openEditModal(bon: Bon): void {
        if (this.hasRole('AUDITEUR')) {
            this.router.navigate(['/auditeur/bons', bon.id]);
        } else {
            this.router.navigate(['/magasinier/bons', bon.id]);
        }
    }

    printBon(bon: Bon, event: MouseEvent): void {
        event.stopPropagation();
        event.preventDefault();
        if (bon.id != null) {
            let docType = 'BON_ENTREE';
            if (bon.typeBon === 'SORTIE') docType = 'BON_SORTIE';
            if (bon.typeBon === 'RETOUR') docType = 'BON_RETOUR';
            this.router.navigate(['/document/preview', bon.id], { queryParams: { type: docType } });
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
        this.isBulkDelete = false;
        this.cdr.detectChanges();
    }

    deleteBon(id: number): void {
        this.logistiqueService.deleteBon(id).subscribe({
            next: () => {
                this.notify('Bon supprimé', 'success');
                this.selectedBonIds.delete(id);
                this.loadBons();
                this.cancelDelete();
            },
            error: () => {
                this.notify('Erreur lors de la suppression', 'error');
            }
        });
    }

    toggleSelection(id: number | undefined, event?: Event): void {
        if (event) event.stopPropagation();
        if (id === undefined) return;

        if (this.selectedBonIds.has(id)) {
            this.selectedBonIds.delete(id);
        } else {
            this.selectedBonIds.add(id);
        }
        this.cdr.detectChanges();
    }

    toggleAllSelections(event: any): void {
        const checked = event.target.checked;
        if (checked) {
            this.filteredBons.forEach(bon => {
                if (bon.id) this.selectedBonIds.add(bon.id);
            });
        } else {
            this.selectedBonIds.clear();
        }
        this.cdr.detectChanges();
    }

    isBonSelected(id: number | undefined): boolean {
        return id !== undefined && this.selectedBonIds.has(id);
    }

    get allBonsSelected(): boolean {
        const filtered = this.filteredBons;
        return filtered.length > 0 && filtered.every(bon => bon.id && this.selectedBonIds.has(bon.id));
    }

    confirmBulkDelete(): void {
        this.isBulkDelete = true;
        this.showDeleteConfirm = true;
        this.cdr.detectChanges();
    }

    executeBulkDelete(): void {
        const idsToDelete = Array.from(this.selectedBonIds);
        let completed = 0;
        let errors = 0;

        idsToDelete.forEach(id => {
            this.logistiqueService.deleteBon(id).subscribe({
                next: () => {
                    completed++;
                    if (completed + errors === idsToDelete.length) {
                        this.finishBulkDelete(completed, errors);
                    }
                },
                error: () => {
                    errors++;
                    if (completed + errors === idsToDelete.length) {
                        this.finishBulkDelete(completed, errors);
                    }
                }
            });
        });
    }

    private finishBulkDelete(completed: number, errors: number): void {
        const totalCount = completed + errors;
        if (errors === 0) {
            this.notify(`${completed} bon(s) supprimé(s)`, 'success');
        } else {
            this.notify(`${completed} bon(s) supprimé(s), ${errors} erreur(s)`, errors === totalCount ? 'error' : 'success');
        }
        this.selectedBonIds.clear();
        this.loadBons();
        this.cancelDelete();
    }

    toggleOptionsMenu(event: MouseEvent) {
        event.stopPropagation();
        this.showOptionsMenu = !this.showOptionsMenu;
    }

    toggleAdvancedFilter() {
        this.showAdvancedFilter = !this.showAdvancedFilter;
        this.cdr.detectChanges();
    }

    resetAdvancedFilter() {
        this.filterType = null;
        this.filterFournisseurId = null;
        this.filterDateFrom = '';
        this.filterDateTo = '';
        this.filterMontantMin = null;
        this.filterMontantMax = null;
        this.filterPieceId = null;
        this.searchTermPiece = '';
        this.searchTermFournisseur = '';
        this.showFournisseurDropdown = false;
        this.showPieceDropdown = false;
        this.cdr.detectChanges();
    }

    hasActiveAdvancedFilter(): boolean {
        return !!(
            this.filterType ||
            this.filterFournisseurId != null ||
            this.filterDateFrom ||
            this.filterDateTo ||
            (this.filterMontantMin != null && !isNaN(this.filterMontantMin)) ||
            (this.filterMontantMax != null && !isNaN(this.filterMontantMax)) ||
            this.filterPieceId != null
        );
    }

    isColumnVisible(key: string): boolean {
        return this.columns.find(c => c.key === key)?.visible || false;
    }

    getAcheteurInitials(user: any): string {
        if (!user || (!user.firstName && !user.username)) return '?';
        const name = user.firstName || user.username;
        return name.charAt(0).toUpperCase();
    }

    getBonHT(bon: Bon): number {
        return bon.mouvement?.montantHTVA || 0;
    }

    getBonTTC(bon: Bon): number {
        return bon.mouvement?.montantTTC || 0;
    }

    getGrandTotalHT(): number {
        return this.filteredBons.reduce((acc, b) => acc + this.getBonHT(b), 0);
    }

    getGrandTotalTTC(): number {
        return this.filteredBons.reduce((acc, b) => acc + this.getBonTTC(b), 0);
    }

    getTypeMouvementLabel(bon: Bon): string {
        const type = bon.mouvement?.typeMouvement;
        if (!type) return 'N/A';

        switch (type) {
            case 'ENTREE_RECEPTION': return 'Réception';
            case 'ENTREE_RETOUR':
                if (bon.bonOrigine?.mouvement?.typeMouvement === 'SORTIE_MAINTENANCE') {
                    return 'Retour Maintenance';
                }
                return 'Retour Client';
            case 'SORTIE_VENTE': return 'Vente';
            case 'SORTIE_PERTE': return 'Perte';
            case 'SORTIE_MAINTENANCE': return 'Maintenance';
            case 'SORTIE_RETOUR': return 'Retour Fournisseur';
            default: return type.replace(/_/g, ' ');
        }
    }

    getTypeLabel(type: TypeBon): string {
        switch (type) {
            case TypeBon.ENTREE: return 'Entrée';
            case TypeBon.SORTIE: return 'Sortie';
            case TypeBon.RETOUR: return 'Retour';
            default: return type;
        }
    }

    getTypeBadgeClass(type: TypeBon): string {
        switch (type) {
            case TypeBon.ENTREE: return 'entree';
            case TypeBon.SORTIE: return 'sortie';
            case TypeBon.RETOUR: return 'retour';
            default: return '';
        }
    }

    getTypeMouvementBadgeClass(bon: Bon): string {
        const type = bon.mouvement?.typeMouvement;
        if (!type) return '';

        if (type.includes('RETOUR')) return 'retour';

        if (type.startsWith('ENTREE')) return 'entree';
        if (type.startsWith('SORTIE')) return 'sortie';
        return '';
    }

    get filteredBons() {
        let list = this.bons;

        const term = (this.searchTerm || '').trim().toLowerCase();
        if (term) {
            list = list.filter(b => {
                const ref = (b.numeroBon || '').toLowerCase();
                const provider = (b.fournisseur?.nom || '').toLowerCase();
                const creator = b.createur ? `${b.createur.firstName || ''} ${b.createur.lastName || ''} ${b.createur.username || ''}`.toLowerCase() : '';
                return ref.includes(term) || provider.includes(term) || creator.includes(term);
            });
        }

        if (this.filterType) {
            list = list.filter(b => b.typeBon === this.filterType);
        }
        if (this.filterFournisseurId != null) {
            list = list.filter(b => b.fournisseur?.id === this.filterFournisseurId);
        }
        if (this.filterDateFrom) {
            const from = new Date(this.filterDateFrom);
            from.setHours(0, 0, 0, 0);
            list = list.filter(b => new Date(b.date) >= from);
        }
        if (this.filterDateTo) {
            const to = new Date(this.filterDateTo);
            to.setHours(23, 59, 59, 999);
            list = list.filter(b => new Date(b.date) <= to);
        }
        if (this.filterMontantMin != null && !isNaN(this.filterMontantMin)) {
            list = list.filter(b => this.getBonTTC(b) >= this.filterMontantMin!);
        }
        if (this.filterMontantMax != null && !isNaN(this.filterMontantMax)) {
            list = list.filter(b => this.getBonTTC(b) <= this.filterMontantMax!);
        }

        if (this.filterPieceId != null) {
            list = list.filter(b =>
                b.mouvement?.ligneMouvement?.some(l => l.piece?.id === this.filterPieceId)
            );
        }

        return list;
    }

    get filteredPieces() {
        const term = this.searchTermPiece.toLowerCase().trim();
        if (!term) return this.pieces;
        return this.pieces.filter(p =>
            p.designation?.toLowerCase().includes(term) ||
            p.reference?.toLowerCase().includes(term) ||
            p.code?.toLowerCase().includes(term)
        );
    }

    selectPiece(pieceId: number | null | undefined) {
        this.filterPieceId = pieceId ?? null;
        this.searchTermPiece = '';
        this.cdr.detectChanges();
    }

    get selectedPieceName(): string {
        if (this.filterPieceId == null) return 'Toutes les pièces';
        const p = this.pieces.find(p => p.id === this.filterPieceId);
        return p ? (p.designation || p.reference || p.code) : 'Pièce inconnue';
    }

    get filteredFournisseurs() {
        const term = this.searchTermFournisseur.toLowerCase().trim();
        if (!term) return this.fournisseurs;
        return this.fournisseurs.filter(f =>
            f.nom?.toLowerCase().includes(term) ||
            f.code?.toLowerCase().includes(term)
        );
    }

    selectFournisseur(fournisseurId: number | null | undefined) {
        this.filterFournisseurId = fournisseurId ?? null;
        this.searchTermFournisseur = '';
        this.cdr.detectChanges();
    }

    get selectedFournisseurName(): string {
        if (this.filterFournisseurId == null) return 'Tous les fournisseurs';
        const f = this.fournisseurs.find(f => f.id === this.filterFournisseurId);
        return f ? (f.nom || f.code) : 'Fournisseur inconnu';
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
}
