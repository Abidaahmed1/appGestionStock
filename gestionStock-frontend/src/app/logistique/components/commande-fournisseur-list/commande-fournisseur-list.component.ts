import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { LogistiqueService } from '../../services/logistique.service';
import { BonCommandeFournisseur, Fournisseur, LigneCommande, StatutCommande, TypeStock } from '../../models/logistique.models';
import { MagasinierService } from '../../../magasinier/services/magasinier.service';

@Component({
    selector: 'app-commande-fournisseur-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './commande-fournisseur-list.component.html',
    styleUrl: './commande-fournisseur-list.component.css'
})
export class CommandeFournisseurListComponent implements OnInit {
    commandes: BonCommandeFournisseur[] = [];
    fournisseurs: Fournisseur[] = [];
    pieces: any[] = [];

    showCreateModal = false;
    selectedCommande: BonCommandeFournisseur | null = null;
    newCommande: BonCommandeFournisseur = this.initNewCommande();

    // Action Modal State
    showActionConfirm = false;
    pendingAction: { type: 'RECEIVE' | 'CANCEL'; cmd: BonCommandeFournisseur } | null = null;

    notification: { message: string, type: 'success' | 'error' } | null = null;
    searchTerm: string = '';
    userRoles: string[] = [];

    showOptionsMenu = false;
    showAdvancedFilter = false;

    /** Filtre avancé */
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

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.userRoles = this.keycloak.getUserRoles() || [];
            this.loadCommandes();
            this.loadFournisseurs();
            this.loadPieces();
        }
    }

    initNewCommande(): BonCommandeFournisseur {
        return {
            numeroCmd: 0,
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

    openCreateModal() {
        this.router.navigate(['/logistique/commandes/nouvelle']);
    }

    viewDetails(id: number) {
        this.router.navigate(['/logistique/commandes', id]);
    }

    /** Ouvre la commande en vue impression (détail + impression). */
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

    /** Ouvre le modal de confirmation pour Recevoir. */
    onRecevoirClick(commande: BonCommandeFournisseur, event: MouseEvent) {
        event.stopPropagation();
        event.preventDefault();
        this.pendingAction = { type: 'RECEIVE', cmd: commande };
        this.showActionConfirm = true;
        this.cdr.detectChanges();
    }

    /** Ouvre le modal de confirmation pour Annuler. */
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

        let successMsg = '';
        let errorMsg = '';

        if (type === 'RECEIVE') {
            cmd.statut = StatutCommande.RECUE;
            successMsg = 'Réception validée avec succès';
            errorMsg = 'Erreur lors de la validation';
        } else if (type === 'CANCEL') {
            cmd.statut = StatutCommande.ANNULEE;
            successMsg = 'Commande annulée';
            errorMsg = 'Erreur lors de l\'annulation';
        }

        // Fermer la boîte de confirmation immédiatement au clic sur Confirmer
        this.closeConfirmModal();
        this.cdr.detectChanges();

        this.logistiqueService.updateCommandeFournisseur(cmd.id, cmd).subscribe({
            next: () => {
                this.notify(successMsg, 'success');
                this.loadCommandes();
            },
            error: () => this.notify(errorMsg, 'error')
        });
    }

    closeConfirmModal() {
        this.showActionConfirm = false;
        this.pendingAction = null;
    }

    /** Bouton « Annuler » du modal : ferme sans exécuter l'action. */
    onModalAnnuler() {
        this.closeConfirmModal();
        this.cdr.detectChanges();
    }

    /** Bouton « Confirmer » du modal : exécute l'action (Recevoir ou Annuler). */
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

    /** Libellé affiché : seuls EN_ATTENTE, RECUE, ANNULEE sont utilisés. */
    getStatutLabel(statut: StatutCommande): string {
        if (statut === StatutCommande.RECUE) return 'Reçue';
        if (statut === StatutCommande.ANNULEE) return 'Annulée';
        return 'En attente'; // EN_ATTENTE et tout autre statut (BROUILLON, VALIDEE, etc.)
    }

    /** Classe CSS pour le pill : en_attente | recue | annulee */
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
}
