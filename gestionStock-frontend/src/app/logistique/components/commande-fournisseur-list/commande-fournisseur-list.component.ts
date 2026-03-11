import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { LogistiqueService } from '../../services/logistique.service';
import { BonCommandeFournisseur, Fournisseur, LigneCommande, StatutCommande, TypeStock } from '../../models/logistique.models';
import { MagasinierService } from '../../../magasinier/services/magasinier.service';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';

@Component({
    selector: 'app-commande-fournisseur-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './commande-fournisseur-list.component.html',
    styleUrl: './commande-fournisseur-list.component.css'
})
export class CommandeFournisseurListComponent implements OnInit {
    readonly StatutCommande = StatutCommande;
    commandes: BonCommandeFournisseur[] = [];
    fournisseurs: Fournisseur[] = [];
    pieces: any[] = [];

    showCreateModal = false;
    selectedCommande: BonCommandeFournisseur | null = null;
    newCommande: BonCommandeFournisseur = this.initNewCommande();

    showActionConfirm = false;
    pendingAction: { type: 'RECEIVE' | 'CANCEL'; cmd: BonCommandeFournisseur } | null = null;

    notification: { message: string, type: 'success' | 'error' } | null = null;
    searchTerm: string = '';
    userRoles: string[] = [];
    entreprise: Entreprise | null = null;

    showOptionsMenu = false;
    showAdvancedFilter = false;

    filterStatut: string = '';
    filterFournisseurId: number | null = null;
    filterDateFrom: string = '';
    filterDateTo: string = '';
    filterMontantMin: number | null = null;
    filterMontantMax: number | null = null;

    readonly statutOptions = [
        { value: '', label: 'Tous les statuts' },
        { value: StatutCommande.EN_ATTENTE, label: 'En attente' },
        { value: StatutCommande.RECUE, label: 'Reçue' },
        { value: StatutCommande.ANNULEE, label: 'Annulée' }
    ];
    columns = [
        { label: 'Référence', key: 'numeroCmd', visible: true, canToggle: false },
        { label: 'Fournisseur & Code', key: 'fournisseur', visible: true, canToggle: true },
        { label: 'Acheteur', key: 'acheteur', visible: true, canToggle: true },
        { label: 'Échéance de commande', key: 'echeance', visible: true, canToggle: true },
        { label: 'Hors taxes', key: 'hors_taxes', visible: true, canToggle: true },
        { label: 'Total', key: 'total', visible: true, canToggle: true },
        { label: 'Statut', key: 'statut', visible: true, canToggle: true }
    ];

    private router = inject(Router);
    private logistiqueService = inject(LogistiqueService);
    private magasinierService = inject(MagasinierService);
    private keycloak = inject(KeycloakService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);
    private entrepriseService = inject(EntrepriseService);

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.userRoles = this.keycloak.getUserRoles() || [];
            this.loadCommandes();
            this.loadFournisseurs();
            this.loadPieces();
            this.loadEntreprise();
        }
    }

    initNewCommande(): BonCommandeFournisseur {
        return {
            numeroCmd: 'AUTO',
            dateCmd: new Date().toISOString(),
            fournisseur: {} as Fournisseur,
            statut: StatutCommande.EN_ATTENTE,
            lignes: []
        };
    }

    loadCommandes() {
        this.logistiqueService.getAllCommandesFournisseurs().subscribe({
            next: (data) => {
                this.commandes = data;
                this.cdr.detectChanges();
            },
            error: () => this.notify('Erreur lors du chargement des commandes', 'error')
        });
    }

    loadFournisseurs() {
        this.logistiqueService.getAllFournisseurs().subscribe(data => this.fournisseurs = data);
    }

    loadPieces() {
        this.logistiqueService.getStocksByType(TypeStock.EN_REAPPROVISIONNEMENT).subscribe({
            next: (stocks) => {
                this.pieces = stocks.map(s => s.piece);
                this.cdr.detectChanges();
            },
            error: () => this.notify('Erreur lors du chargement des pièces à commander', 'error')
        });
    }

    loadEntreprise() {
        this.entrepriseService.getCurrentEntreprise().subscribe({
            next: (data) => {
                this.entreprise = data;
                this.cdr.detectChanges();
            },
            error: () => {
                // Fallback: prendre la première entreprise si /current n'est pas disponible
                this.entrepriseService.getAllEntreprises().subscribe({
                    next: (list) => {
                        if (list && list.length > 0) {
                            this.entreprise = list[0];
                            this.cdr.detectChanges();
                        }
                    }
                });
            }
        });
    }

    openCreateModal() {
        this.router.navigate(['/logistique/commandes/nouvelle']);
    }

    viewDetails(id: number) {
        this.router.navigate(['/logistique/commandes', id]);
    }

    printCommande(cmd: BonCommandeFournisseur, event: MouseEvent) {
        event.stopPropagation();
        event.preventDefault();
        if (cmd.id != null) {
            this.router.navigate(['/logistique/commandes', cmd.id], { queryParams: { print: '1' } });
        }
    }

    addLigne() {
        if (!this.newCommande.lignes) this.newCommande.lignes = [];
        this.newCommande.lignes.push({ piece: null, qteCmd: 1, prixAchat: 0 });
    }

    removeLigne(index: number) {
        this.newCommande.lignes?.splice(index, 1);
    }

    saveCommande() {
        this.newCommande.statut = StatutCommande.EN_ATTENTE;
        this.logistiqueService.createCommandeFournisseur(this.newCommande).subscribe({
            next: () => {
                this.notify('Commande créée avec succès', 'success');
                this.loadCommandes();
                this.showCreateModal = false;
            },
            error: () => this.notify('Erreur lors de la création', 'error')
        });
    }

    onActionsCellClick(event: MouseEvent) {
        event.stopPropagation();
        event.preventDefault();
    }

    onRecevoirClick(commande: BonCommandeFournisseur, event: MouseEvent) {
        event.stopPropagation();
        event.preventDefault();
        this.pendingAction = { type: 'RECEIVE', cmd: commande };
        this.showActionConfirm = true;
        this.cdr.detectChanges();
    }

    onAnnulerClick(commande: BonCommandeFournisseur, event: MouseEvent) {
        event.stopPropagation();
        event.preventDefault();
        this.pendingAction = { type: 'CANCEL', cmd: commande };
        this.showActionConfirm = true;
        this.cdr.detectChanges();
    }

    annulerCommande(commande: BonCommandeFournisseur, event?: MouseEvent) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.pendingAction = { type: 'CANCEL', cmd: commande };
        this.showActionConfirm = true;
    }

    recevoirCommande(commande: BonCommandeFournisseur, event?: MouseEvent) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.pendingAction = { type: 'RECEIVE', cmd: commande };
        this.showActionConfirm = true;
    }

    executeAction() {
        if (!this.pendingAction) return;

        const { type, cmd } = this.pendingAction;
        if (!cmd.id) return;

        const targetStatut = type === 'RECEIVE' ? StatutCommande.RECUE : StatutCommande.ANNULEE;
        const successMsg = type === 'RECEIVE' ? 'Réception validée avec succès' : 'Commande annulée';
        const errorMsg = type === 'RECEIVE' ? 'Erreur lors de la validation' : 'Erreur lors de l’annulation';

        // Extremely clean payload - only IDs and primitive values
        const payload: any = {
            id: cmd.id,
            numeroCmd: cmd.numeroCmd,
            dateCmd: cmd.dateCmd,
            dateArrivee: (cmd.dateArrivee && cmd.dateArrivee !== '') ? cmd.dateArrivee : null,
            statut: targetStatut,
            fournisseur: { id: cmd.fournisseur?.id },
            lignes: cmd.lignes?.map(l => ({
                id: l.id,
                qteCmd: l.qteCmd,
                prixAchat: l.prixAchat,
                taxe: l.taxe,
                remise: l.remise,
                piece: { id: l.piece?.id || l.piece },
                detailPiece: l.detailPiece?.id ? { id: l.detailPiece.id } : null
            }))
        };

        this.closeConfirmModal();
        this.cdr.detectChanges();

        this.logistiqueService.updateCommandeFournisseur(cmd.id, payload).subscribe({
            next: () => {
                this.notify(successMsg, 'success');
                this.loadCommandes();
            },
            error: (err) => {
                console.error('Update error:', err);
                const detail = err.error?.message || (typeof err.error === 'string' ? err.error : 'Erreur réseau');
                this.notify(`${errorMsg} : ${detail}`, 'error');
                this.loadCommandes();
            }
        });
    }

    closeConfirmModal() {
        this.showActionConfirm = false;
        this.pendingAction = null;
    }

    onModalAnnuler() {
        this.closeConfirmModal();
        this.cdr.detectChanges();
    }

    onModalConfirmer() {
        this.executeAction();
        this.cdr.detectChanges();
    }

    toggleOptionsMenu(event: MouseEvent) {
        event.stopPropagation();
        this.showOptionsMenu = !this.showOptionsMenu;
    }

    isColumnVisible(key: string): boolean {
        return this.columns.find(c => c.key === key)?.visible || false;
    }

    get filteredCommandes(): BonCommandeFournisseur[] {
        let list = this.commandes;

        const term = (this.searchTerm || '').trim().toLowerCase();
        if (term) {
            list = list.filter(cmd => {
                const ref = String(cmd.numeroCmd || '').toLowerCase();
                const fournisseurNom = (cmd.fournisseur?.nom || '').toLowerCase();
                const fournisseurCode = (cmd.fournisseur?.code || '').toLowerCase();
                const acheteur = cmd.createur
                    ? `${(cmd.createur.firstName || '')} ${(cmd.createur.lastName || '')}`.toLowerCase()
                    : '';
                const statut = this.getStatutLabel(cmd.statut).toLowerCase();
                return ref.includes(term) ||
                    fournisseurNom.includes(term) ||
                    fournisseurCode.includes(term) ||
                    acheteur.includes(term) ||
                    statut.includes(term);
            });
        }

        if (this.filterStatut) {
            list = list.filter(cmd => cmd.statut === this.filterStatut);
        }
        if (this.filterFournisseurId != null) {
            list = list.filter(cmd => cmd.fournisseur?.id === this.filterFournisseurId);
        }
        if (this.filterDateFrom) {
            const from = new Date(this.filterDateFrom);
            from.setHours(0, 0, 0, 0);
            list = list.filter(cmd => {
                const d = new Date(cmd.dateCmd);
                d.setHours(0, 0, 0, 0);
                return d >= from;
            });
        }
        if (this.filterDateTo) {
            const to = new Date(this.filterDateTo);
            to.setHours(23, 59, 59, 999);
            list = list.filter(cmd => new Date(cmd.dateCmd) <= to);
        }
        if (this.filterMontantMin != null && !isNaN(this.filterMontantMin)) {
            list = list.filter(cmd => this.getCommandeTTC(cmd) >= this.filterMontantMin!);
        }
        if (this.filterMontantMax != null && !isNaN(this.filterMontantMax)) {
            list = list.filter(cmd => this.getCommandeTTC(cmd) <= this.filterMontantMax!);
        }

        // Sort by status priority: EN_ATTENTE (1), RECUE (2), ANNULEE (3)
        list.sort((a, b) => {
            const priority: Record<string, number> = {
                [StatutCommande.EN_ATTENTE]: 1,
                [StatutCommande.RECUE]: 2,
                [StatutCommande.ANNULEE]: 3
            };
            const pA = priority[a.statut] || 99;
            const pB = priority[b.statut] || 99;

            if (pA !== pB) return pA - pB;

            // Secondary sort by date (newest first)
            return new Date(b.dateCmd).getTime() - new Date(a.dateCmd).getTime();
        });

        return list;
    }

    toggleAdvancedFilter() {
        this.showAdvancedFilter = !this.showAdvancedFilter;
        this.cdr.detectChanges();
    }

    resetAdvancedFilter() {
        this.filterStatut = '';
        this.filterFournisseurId = null;
        this.filterDateFrom = '';
        this.filterDateTo = '';
        this.filterMontantMin = null;
        this.filterMontantMax = null;
        this.cdr.detectChanges();
    }

    hasActiveAdvancedFilter(): boolean {
        return !!(
            this.filterStatut ||
            this.filterFournisseurId != null ||
            this.filterDateFrom ||
            this.filterDateTo ||
            (this.filterMontantMin != null && !isNaN(this.filterMontantMin)) ||
            (this.filterMontantMax != null && !isNaN(this.filterMontantMax))
        );
    }

    getGrandTotalHT(): number {
        return this.filteredCommandes.reduce((acc, cmd) => acc + this.getCommandeHT(cmd), 0);
    }

    getGrandTotalTTC(): number {
        return this.filteredCommandes.reduce((acc, cmd) => acc + this.getCommandeTTC(cmd), 0);
    }

    printList() {
        window.print();
    }

    getCommandeHT(cmd: BonCommandeFournisseur): number {
        if (!cmd.lignes) return 0;
        return cmd.lignes.reduce((acc, l) => acc + (l.qteCmd * (l.prixAchat || 0) * (1 - (l.remise || 0) / 100)), 0);
    }

    getCommandeTTC(cmd: BonCommandeFournisseur): number {
        if (!cmd.lignes) return 0;
        return cmd.lignes.reduce((acc, l) => {
            const ht = l.qteCmd * (l.prixAchat || 0) * (1 - (l.remise || 0) / 100);
            return acc + (ht * (1 + (l.taxe || 0) / 100));
        }, 0);
    }

    getAcheteurInitials(user: any): string {
        if (!user || !user.firstName) return '';
        return user.firstName.charAt(0).toUpperCase();
    }

    getStatutLabel(statut: StatutCommande): string {
        if (statut === StatutCommande.RECUE) return 'Reçue';
        if (statut === StatutCommande.ANNULEE) return 'Annulée';
        return 'En attente';
    }

    getStatutClass(statut: StatutCommande): string {
        if (statut === StatutCommande.RECUE) return 'recue';
        if (statut === StatutCommande.ANNULEE) return 'annulee';
        return 'en_attente';
    }

    notify(message: string, type: 'success' | 'error') {
        this.notification = { message, type };
        setTimeout(() => this.notification = null, 3000);
        this.cdr.detectChanges();
    }

    isAuditeur(): boolean {
        return this.userRoles.some(r =>
            r.toLowerCase() === 'auditeur' ||
            r.toLowerCase() === 'role_auditeur'
        );
    }
}
