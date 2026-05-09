import { Component, OnInit, OnDestroy, inject, NgZone, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin, of, interval } from 'rxjs';
import { catchError, switchMap, distinctUntilChanged } from 'rxjs/operators';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { InventaireService, CreateInventaireRequest } from '../../services/inventaire.service';
import { Inventaire, LigneInventaire, TypeInventaire } from '../../models/inventaire.models';
import { AdminService } from '../../../admin/services/admin.service';
import { UserRepresentation } from '../../../admin/models/admin.models';
import { MagasinierService } from '../../../magasinier/services/magasinier.service';
import { DocumentConfigService, DocumentDisplaySetting, DocumentType } from '../../../admin/services/document-config.service';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';

@Component({
  selector: 'app-audit-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './audit-hub.component.html',
  styleUrl: './audit-hub.component.css'
})
export class AuditHubComponent implements OnInit, OnDestroy {
  private inventaireService = inject(InventaireService);
  private adminService = inject(AdminService);
  private magasinierService = inject(MagasinierService);
  private docConfigService = inject(DocumentConfigService);
  private entrepriseService = inject(EntrepriseService);
  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);

  inventaires: Inventaire[] = [];
  currentAudit: Inventaire | null = null;
  notification: { msg: string, type: 'success' | 'error' } | null = null;
  searchTerm = '';
  filterGaps = false;
  barcodeInput = '';
  isSaving = false;
  lastSaved: Date | null = null;

  showRecountDialog = false;
  recountMotif = '';
  private pendingRecountLigne: LigneInventaire | null = null;

  showCorrectionDialog = false;
  correctionValue: number = 0;
  public pendingCorrectionLigne: LigneInventaire | null = null;
  showCorrectionConfirmation = false;
  isCorrecting = false;
  recentlySavedLigneId: number | null = null;

  showRefusDialog = false;
  pendingRefusLigne: LigneInventaire | null = null;

  showValidationConfirmation = false;
  pendingValidationLigne: LigneInventaire | null = null;

  showResetConfirmation = false;
  pendingResetLigne: LigneInventaire | null = null;

  showLineHistoryDialog = false;
  selectedLineForHistory: LigneInventaire | null = null;

  showHistoriqueDialog = false;
  historiqueCorrections: any[] = [];
  isLoadingHistorique = false;
  searchTermHistorique: string = '';
  filterDateHistorique: string = '';
  selectedAuditorHistorique: string = '';
  impactFilterHistorique: 'all' | 'increase' | 'decrease' = 'all';
  showAdvancedFilters = false;

  showWizard = false;
  wizardStep = 1;
  newReq: CreateInventaireRequest = {
    nom: '',
    type: TypeInventaire.TOTAL.toString(),
    date: new Date(),
    affectations: []
  };

  availablePieces: any[] = [];
  filteredPieces: any[] = [];
  availableCategories: any[] = [];
  targetCatId: number = 0; // Keeping for backward compatibility if needed elsewhere, but using selectedCatIds primarily
  selectedCatIds = new Set<number>([0]);
  isCatSelectOpened = false;
  catSearchTerm = '';
  selectedIds = new Set<number>();
  assigns: { [id: number]: string } = {};
  users: UserRepresentation[] = [];

  localStats = {
    total: 0,
    active: 0,
    accuracy: 0,
    globalGaps: 0
  };

  inventaireConfig: DocumentDisplaySetting | null = null;
  entreprise: Entreprise | null = null;
  isPrinting = false;

  showChangeAuditorDialog = false;
  auditors: UserRepresentation[] = [];
  selectedNewAuditorId: string = '';

  // Auto-sync
  syncPulse = false;           // Anime l'icône de sync quand il y a du nouveau
  lastSyncedAt: Date | null = null;
  private pollingStop$ = new Subject<void>();  // Stop signal pour le polling de l'audit

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.refreshHub();
      this.loadUsers();
      this.loadDocumentConfig();
      this.loadCategories();

      // Polling de la liste (toutes les 30s)
      interval(30000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          if (!this.currentAudit) {
            this.refreshHub();
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.pollingStop$.next();
    this.pollingStop$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDocumentConfig(): void {
    forkJoin({
      config: this.docConfigService.getSettingByType(DocumentType.INVENTAIRE).pipe(
        catchError(() => of(this.getDefaultConfig()))
      ),
      entreprise: this.entrepriseService.getCurrentEntreprise().pipe(
        catchError(() => of(null as any))
      )
    }).subscribe(({ config, entreprise }) => {
      this.inventaireConfig = config;
      this.entreprise = entreprise;
    });
  }

  private getDefaultConfig(): DocumentDisplaySetting {
    return {
      documentType: DocumentType.INVENTAIRE,
      primaryColor: '#0D9488',
      secondaryColor: '#1e293b',
      showLogo: true,
      showSignatureMagasinier: true,
      showSignatureClient: true,
      layout: 'MODERN',
      fontSize: 'MEDIUM',
      showPriceHT: false,
      showTVA: false,
      showDiscount: false,
      visibleVarianteIds: []
    };
  }

  getLogoUrl(): string {
    if (this.entreprise?.logoUrl) {
      return this.entrepriseService.getImageUrl(this.entreprise.logoUrl);
    }
    return '';
  }

  toggleCatSelect() {
    this.isCatSelectOpened = !this.isCatSelectOpened;
  }

  selectCat(catId: number) {
    if (catId === 0) {
      this.selectedCatIds.clear();
      this.selectedCatIds.add(0);
    } else {
      if (this.selectedCatIds.has(0)) {
        this.selectedCatIds.delete(0);
      }

      if (this.selectedCatIds.has(catId)) {
        this.selectedCatIds.delete(catId);
      } else {
        this.selectedCatIds.add(catId);
      }

      if (this.selectedCatIds.size === 0) {
        this.selectedCatIds.add(0);
      }
    }
  }

  getSelectedCatName(): string {
    if (this.selectedCatIds.has(0)) return 'Toutes les catégories disponibles...';
    if (this.selectedCatIds.size === 1) {
      const id = Array.from(this.selectedCatIds)[0];
      const cat = this.availableCategories.find(c => c.id === id);
      return cat ? cat.nom : '1 catégorie';
    }
    return `${this.selectedCatIds.size} catégories sélectionnées`;
  }

  get filteredCategories(): any[] {
    if (!this.catSearchTerm) return this.availableCategories;
    return this.availableCategories.filter(c =>
      c.nom.toLowerCase().includes(this.catSearchTerm.toLowerCase())
    );
  }

  printInventaire(): void {
    if (!this.currentAudit) return;

    this.docConfigService.getSettingByType(DocumentType.INVENTAIRE).pipe(
      catchError(() => of(this.inventaireConfig || this.getDefaultConfig()))
    ).subscribe(config => {
      this.inventaireConfig = config;
      this.isPrinting = true;

      const root = document.documentElement;
      root.style.setProperty('--inv-primary', config.primaryColor || '#0D9488');
      root.style.setProperty('--inv-secondary', config.secondaryColor || '#1e293b');
      root.style.setProperty('--inv-font-size', config.fontSize === 'SMALL' ? '11px' : config.fontSize === 'LARGE' ? '15px' : '13px');

      setTimeout(() => {
        window.print();
        setTimeout(() => { this.isPrinting = false; }, 500);
      }, 100);
    });
  }
  refreshHub(): void {
    this.inventaireService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.inventaires = data;
          this.calculateHubStats();
        },
        error: () => this.notify("Erreur de synchronisation du Hub", 'error')
      });
  }

  calculateHubStats(): void {
    const active = this.inventaires.filter(i => !i.estValide).length;
    let totalItems = 0;
    let conformItems = 0;
    let totalGaps = 0;

    this.inventaires.forEach(inv => {
      inv.lignes.forEach(l => {
        totalItems++;
        if (l.ecart === 0) conformItems++;
        if (l.ecart !== 0 && l.ecart !== null) totalGaps++;
      });
    });

    this.localStats = {
      total: this.inventaires.length,
      active,
      accuracy: totalItems ? Math.round((conformItems / totalItems) * 100) : 100,
      globalGaps: totalGaps
    };
  }

  loadUsers(): void {
    this.adminService.getAllUsers()
      .subscribe(u => {
        this.users = u.filter(user => user.enabled && (user.role === 'RESPONSABLE_LOGISTIQUE' || user.role === 'ADMINISTRATEUR'));
      });
  }

  selectAudit(inv: Inventaire): void {
    this.inventaireService.getById(inv.id!)
      .subscribe({
        next: (detailed) => {
          this.currentAudit = detailed;
          this.lastSaved = null;
          this.startAuditPolling(inv.id!);
        },
        error: () => this.notify("Échec du chargement des détails", 'error')
      });
  }

  /** Polling automatique toutes les 8s quand un audit est ouvert */
  private startAuditPolling(auditId: number): void {
    // Stopper tout polling précédent
    this.pollingStop$.next();

    interval(8000)
      .pipe(
        takeUntil(this.pollingStop$),
        takeUntil(this.destroy$),
        switchMap(() => this.inventaireService.getById(auditId).pipe(
          catchError(() => of(null))
        ))
      )
      .subscribe(updated => {
        if (!updated || !this.currentAudit) return;

        // Détecter si une nouvelle ligne a été scannée depuis la dernière actualisation
        const prevScanned = this.currentAudit.lignes.filter(l => l.stockPhysique !== null).length;
        const newScanned  = updated.lignes.filter((l: any) => l.stockPhysique !== null).length;
        const hasNewScan  = newScanned > prevScanned;

        this.currentAudit = updated;
        this.lastSyncedAt = new Date();

        if (hasNewScan) {
          // Anim pulse comme les notifications
          this.syncPulse = true;
          setTimeout(() => this.syncPulse = false, 1500);
        }
      });
  }

  /** Arrêter le polling et revenir à la liste */
  backToList(): void {
    this.pollingStop$.next();
    this.currentAudit = null;
    this.refreshHub(); // Re-calculer les stats au retour
  }

  loadCategories(): void {
    this.magasinierService.getCategories().subscribe(c => this.availableCategories = c);
  }

  openWizard(): void {
    if (this.localStats.active > 0) {
      this.notify("Opération Interdite : Un audit est déjà en cours de traitement. Veuillez le finaliser avant de créer un nouvel audit.", 'error');
      return;
    }
    this.showWizard = true;
    this.wizardStep = 1;
    this.selectedCatIds = new Set<number>([0]);
    this.targetCatId = 0;
    this.newReq = {
      nom: `Audit ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} - ${new Date().getHours()}h${new Date().getMinutes()}`,
      type: TypeInventaire.TOTAL.toString(),
      date: new Date(),
      affectations: []
    };
    this.selectedIds.clear();
    this.assigns = {};

    if (this.availableCategories.length === 0) {
      this.loadCategories();
    }
    if (this.availablePieces.length === 0) {
      this.inventaireService.getPiecesDisponibles().subscribe(p => {
        this.availablePieces = p;
        this.filteredPieces = p;
      });
    }
  }

  createAudit(): void {
    const req: CreateInventaireRequest = { ...this.newReq };

    if (this.newReq.type === 'PARTIEL_CATEGORIE') {
      // Send selected category IDs to backend
      req.categoryIds = Array.from(this.selectedCatIds).filter(id => id !== 0);
      req.affectations = [];

      if (req.categoryIds.length === 0 && !this.selectedCatIds.has(0)) {
        this.notify("Veuillez sélectionner au moins une catégorie.", 'error');
        return;
      }
    } else if (this.newReq.type !== 'TOTAL') {
      req.affectations = Object.entries(this.assigns)
        .map(([pId, rId]) => ({ pieceId: Number(pId), responsableId: rId }))
        .filter(a => a.pieceId);

      if (req.affectations.length === 0) {
        this.notify("Veuillez sélectionner au moins un produit.", 'error');
        return;
      }
    }
    this.inventaireService.createFromRequest(req).subscribe({
      next: (val) => {
        this.inventaires.unshift(val);
        this.refreshHub();
        this.selectAudit(val);
        this.showWizard = false;
        this.notify("Inventaire lancé (Mode Collaboratif)", 'success');
      },
      error: (err) => this.notify(err.error?.message || "La création a échoué", 'error')
    });
  }

  updateLigne(l: LigneInventaire): void {
    l.ecart = (l.stockPhysique || 0) - (l.stockTheorique || 0);
    this.autoSave();
  }

  saveComment(l: LigneInventaire): void {
    if (!l.id) return;
    this.recentlySavedLigneId = l.id;
    this.autoSave();
    setTimeout(() => {
      if (this.recentlySavedLigneId === l.id) {
        this.recentlySavedLigneId = null;
      }
    }, 1500);
  }

  autoSave(): void {
    if (!this.currentAudit || this.isSaving) return;
    this.isSaving = true;
    this.inventaireService.update(this.currentAudit.id!, this.currentAudit)
      .subscribe({
        next: (inv) => {
          this.currentAudit = inv;
          this.isSaving = false;
          this.lastSaved = new Date();
        },
        error: () => this.isSaving = false
      });
  }

  validateAudit(): void {
    if (!this.currentAudit?.id) return;
    this.inventaireService.valider(this.currentAudit.id).subscribe({
      next: () => {
        this.notify("Audit validé. Réconcilliation terminée.", 'success');
        this.refreshHub();
        this.selectAudit(this.currentAudit!);
      },
      error: (err) => {
        this.notify(err.error?.message || "Échec de la validation de l'inventaire", 'error');
      }
    });
  }

  onScan(e: any): void {
    if (!this.barcodeInput || !this.currentAudit) return;
    const l = this.currentAudit.lignes.find(line => line.piece?.codeBarre === this.barcodeInput);
    if (l) {
      l.stockPhysique = (l.stockPhysique || 0) + 1;
      this.updateLigne(l);
      this.barcodeInput = '';
      this.notify(`✓ Scanne: ${l.piece?.designation}`, 'success');
    } else {
      this.notify("Produit inconnu dans cet audit", 'error');
    }
  }

  get filteredRows(): LigneInventaire[] {
    if (!this.currentAudit) return [];
    return this.currentAudit.lignes.filter(l => {
      const match = !this.searchTerm || l.piece?.designation?.toLowerCase().includes(this.searchTerm.toLowerCase()) || l.piece?.reference?.toLowerCase().includes(this.searchTerm.toLowerCase());
      const gap = !this.filterGaps || l.ecart !== 0;
      return match && gap;
    });
  }

  validerLigne(l: LigneInventaire): void {
    if (!this.currentAudit?.id || !l.id) return;
    this.pendingValidationLigne = l;
    this.showValidationConfirmation = true;
  }

  confirmValidation(): void {
    if (!this.currentAudit?.id || !this.pendingValidationLigne?.id) return;

    this.inventaireService.validerLigne(this.currentAudit.id, this.pendingValidationLigne.id).subscribe({
      next: (inv) => {
        this.currentAudit = inv;
        this.showValidationConfirmation = false;
        this.pendingValidationLigne = null;
        this.notify('Ligne validée avec succès', 'success');
      },
      error: (err) => {
        this.showValidationConfirmation = false;
        this.notify(err.error?.message || 'Erreur de validation', 'error');
      }
    });
  }

  cancelValidation(): void {
    this.showValidationConfirmation = false;
    this.pendingValidationLigne = null;
  }

  refaireLigne(l: LigneInventaire): void {
    if (!this.currentAudit?.id || !l.id) return;
    this.pendingRecountLigne = l;
    this.recountMotif = '';
    this.showRecountDialog = true;
  }

  confirmRecount(): void {
    if (!this.currentAudit?.id || !this.pendingRecountLigne?.id) return;
    this.showRecountDialog = false;
    this.inventaireService.demanderRecomptage(this.currentAudit.id, this.pendingRecountLigne.id, this.recountMotif).subscribe({
      next: (inv: Inventaire) => {
        this.currentAudit = inv;
        this.pendingRecountLigne = null;
        this.notify('Demande de re-comptage envoyée avec succès', 'success');
      },
      error: () => this.notify('Erreur lors de la demande', 'error')
    });
  }

  cancelRecount(): void {
    this.showRecountDialog = false;
    this.pendingRecountLigne = null;
    this.recountMotif = '';
  }

  refuserLigne(l: LigneInventaire): void {
    if (!this.currentAudit?.id || !l.id) return;
    this.pendingRefusLigne = l;
    this.showRefusDialog = true;
  }

  confirmRefus(): void {
    this._handleRefus(true);
  }

  refuseOnly(): void {
    this._handleRefus(false);
  }

  private _handleRefus(showCorrection: boolean): void {
    if (!this.currentAudit?.id || !this.pendingRefusLigne?.id) return;
    this.inventaireService.refuserLigne(this.currentAudit.id, this.pendingRefusLigne.id).subscribe({
      next: (inv: Inventaire) => {
        this.currentAudit = inv;
        this.showRefusDialog = false;
        this.notify('Scan refusé.', 'error');

        if (showCorrection) {
          const updatedLigne = this.currentAudit.lignes.find(x => x.id === this.pendingRefusLigne!.id);
          if (updatedLigne) {
            this.ouvrirCorrection(updatedLigne);
          }
        }
        this.pendingRefusLigne = null;
      },
      error: () => this.notify('Erreur lors du refus', 'error')
    });
  }

  cancelRefus(): void {
    this.showRefusDialog = false;
    this.pendingRefusLigne = null;
  }

  reinitialiserLigne(l: LigneInventaire): void {
    if (!this.currentAudit?.id || !l.id) return;
    this.pendingResetLigne = l;
    this.showResetConfirmation = true;
  }

  confirmReset(): void {
    if (!this.currentAudit?.id || !this.pendingResetLigne?.id) return;

    this.inventaireService.reinitialiserLigne(this.currentAudit.id, this.pendingResetLigne.id).subscribe({
      next: (inv: Inventaire) => {
        this.currentAudit = inv;
        this.showResetConfirmation = false;
        this.pendingResetLigne = null;
        this.notify('Décision réinitialisée', 'success');
      },
      error: () => {
        this.showResetConfirmation = false;
        this.notify('Erreur lors de la réinitialisation', 'error');
      }
    });
  }

  cancelReset(): void {
    this.showResetConfirmation = false;
    this.pendingResetLigne = null;
  }

  ouvrirCorrection(l: LigneInventaire): void {
    if (!this.currentAudit?.id || !l.id) return;
    this.pendingCorrectionLigne = l;
    this.correctionValue = l.stockPhysique || l.stockTheorique || 0;
    this.showCorrectionDialog = true;
  }

  confirmCorrection(): void {
    if (!this.currentAudit?.id || !this.pendingCorrectionLigne?.id || this.isCorrecting) return;

    if (!this.showCorrectionConfirmation) {
      this.showCorrectionConfirmation = true;
      this.showCorrectionDialog = false; // ON FERME LA MODALE DE SAISIE
      return;
    }

    this.isCorrecting = true;
    const qty = this.correctionValue;

    this.inventaireService.corrigerLigneManuellement(this.currentAudit.id, this.pendingCorrectionLigne.id, qty)
      .subscribe({
        next: (inv: Inventaire) => {
          this.currentAudit = inv;
          this.isCorrecting = false;
          this.showCorrectionDialog = false;
          this.showCorrectionConfirmation = false;
          this.notify('Stock corrigé avec succès et enregistré dans l\'historique', 'success');
        },
        error: () => {
          this.isCorrecting = false;
          this.showCorrectionConfirmation = false;
          this.notify('Erreur lors de la correction', 'error');
        }
      });
  }

  cancelCorrectionChange(): void {
    this.showCorrectionConfirmation = false;
    this.showCorrectionDialog = true; // ON RE-OUVRE LA MODALE SI ANNULÉ
  }

  cancelCorrection(): void {
    this.showCorrectionDialog = false;
    this.showCorrectionConfirmation = false;
    this.pendingCorrectionLigne = null;
    this.correctionValue = 0;
  }

  ouvrirHistorique(): void {
    this.isLoadingHistorique = true;
    this.showHistoriqueDialog = true;
    this.searchTermHistorique = '';
    this.filterDateHistorique = '';
    this.inventaireService.getCorrectionHistoriques().subscribe({
      next: (data) => {
        // Extraction intelligente des valeurs pour éviter le NaN dans le design premium
        this.historiqueCorrections = data.map((h: any) => {
          if (h.details && (!h.ancienneValeur || !h.nouvelleValeur)) {
            const parts = h.details.match(/de (\d+) à (\d+)/);
            if (parts) {
              h.ancienneValeur = parseInt(parts[1]);
              h.nouvelleValeur = parseInt(parts[2]);
            }
          }
          return h;
        });
        this.isLoadingHistorique = false;
      },
      error: () => {
        this.notify('Erreur lors du chargement de l\'historique', 'error');
        this.isLoadingHistorique = false;
      }
    });
  }

  fermerHistorique(): void {
    this.showHistoriqueDialog = false;
    this.historiqueCorrections = [];
    this.searchTermHistorique = '';
    this.filterDateHistorique = '';
  }

  ouvrirHistoriqueLigne(l: LigneInventaire): void {
    this.selectedLineForHistory = l;
    this.showLineHistoryDialog = true;
  }

  fermerHistoriqueLigne(): void {
    this.showLineHistoryDialog = false;
    this.selectedLineForHistory = null;
  }

  formatActionName(action: string): string {
    if (!action) return 'Action inconnue';
    const mapping: { [key: string]: string } = {
      'SCAN_MOBILE': 'Scan Mobile',
      'MISE_A_JOUR_SCAN': 'Mise à jour Scan',
      'VALIDATION_LIGNE': 'Validation de la ligne',
      'REFUS_LIGNE': 'Refus de la ligne',
      'DEMANDE_RECOMPTAGE': 'Demande de re-comptage',
      'CORRECTION_MANUELLE': 'Correction manuelle',
      'REINITIALISATION_LIGNE': 'Réinitialisation'
    };
    return mapping[action] || action;
  }

  formatStatut(statut: string): string {
    if (!statut) return '-';
    const mapping: { [key: string]: string } = {
      'A_SCANNER': 'À scanner',
      'EN_ATTENTE_AUDIT': 'En attente audit',
      'A_RECOMPTER': 'À re-compter',
      'VALIDE': 'Validé',
      'REFUSE': 'Refusé'
    };
    return mapping[statut] || statut;
  }

  getSortedHistory(l: LigneInventaire | null): any[] {
    if (!l?.historique) return [];
    return [...l.historique].sort((a, b) => (b.id || 0) - (a.id || 0));
  }

  get filteredHistorique(): any[] {
    return this.historiqueCorrections.filter(h => {
      const search = this.searchTermHistorique.toLowerCase();
      const matchSearch = !search ||
        h.details?.toLowerCase().includes(search) ||
        h.piece?.designation?.toLowerCase().includes(search) ||
        h.piece?.reference?.toLowerCase().includes(search);

      let matchDate = true;
      if (this.filterDateHistorique && h.date) {
        const dateStr = new Date(h.date).toISOString().split('T')[0];
        matchDate = dateStr === this.filterDateHistorique;
      }

      const matchAuditor = !this.selectedAuditorHistorique || h.auditeur?.includes(this.selectedAuditorHistorique);

      let matchImpact = true;
      if (this.impactFilterHistorique !== 'all' && h.details) {
        const parts = h.details.match(/de (\d+) à (\d+)/);
        if (parts) {
          const from = parseInt(parts[1]);
          const to = parseInt(parts[2]);
          if (this.impactFilterHistorique === 'increase') matchImpact = to > from;
          if (this.impactFilterHistorique === 'decrease') matchImpact = from > to;
        }
      }

      return matchSearch && matchDate && matchAuditor && matchImpact;
    });
  }

  get groupedHistorique(): { date: string, items: any[] }[] {
    const filtered = this.filteredHistorique;
    const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const groups: { [key: string]: any[] } = {};

    sorted.forEach(h => {
      const d = new Date(h.date);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let key = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      if (d.toDateString() === today.toDateString()) key = "Aujourd'hui";
      else if (d.toDateString() === yesterday.toDateString()) key = "Hier";

      if (!groups[key]) groups[key] = [];
      groups[key].push(h);
    });

    return Object.keys(groups).map(key => ({ date: key, items: groups[key] }));
  }

  notify(msg: string, type: 'success' | 'error'): void {
    this.notification = { msg, type };
    setTimeout(() => this.notification = null, 4000);
  }

  getEffectiveEcart(l: LigneInventaire): number {
    if (l.stockPhysique !== null && l.stockPhysique !== undefined) {
      return l.stockPhysique - (l.stockTheorique ?? 0);
    }
    return l.ecart ?? 0;
  }

  hasEcart(l: LigneInventaire): boolean {
    return l.stockPhysique !== null && l.stockPhysique !== undefined
      ? this.getEffectiveEcart(l) !== 0
      : (l.ecart ?? 0) !== 0;
  }

  getEnCoursCount = () => this.inventaires.filter(i => !i.estValide).length;
  getGapCount = () => this.currentAudit?.lignes.filter(l => this.hasEcart(l)).length || 0;
  getConformeCount = () => this.currentAudit?.lignes.filter(l => !this.hasEcart(l) && l.stockPhysique !== null).length || 0;
  getGapTotal = () => this.currentAudit?.lignes.reduce((sum, l) => sum + Math.abs(this.getEffectiveEcart(l)), 0) || 0;
}

