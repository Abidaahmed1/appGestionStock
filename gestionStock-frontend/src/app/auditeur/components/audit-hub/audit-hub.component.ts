import { Component, OnInit, OnDestroy, inject, NgZone, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
  imports: [CommonModule, FormsModule],
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
  targetCatId: number = 0;
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

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.refreshHub();
      this.loadUsers();
      this.loadDocumentConfig();
    }
  }

  ngOnDestroy(): void {
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
        this.users = u.filter(user => user.enabled && (user.role === 'RESPONSABLE_LOGISTIQUE' || user.role === 'ADMIN'));
      });
  }

  selectAudit(inv: Inventaire): void {
    this.inventaireService.getById(inv.id!)
      .subscribe({
        next: (detailed) => {
          this.currentAudit = detailed;
          this.lastSaved = null;
        },
        error: () => this.notify("Échec du chargement des détails", 'error')
      });
  }

  openWizard(): void {
    if (this.localStats.active > 0) {
      this.notify("Opération Interdite : Un audit est déjà en cours de traitement. Veuillez le valider ou le supprimer.", 'error');
      return;
    }
    this.showWizard = true;
    this.wizardStep = 1;
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
      this.magasinierService.getCategories().subscribe((c: any[]) => this.availableCategories = c);
    }
    if (this.availablePieces.length === 0) {
      this.inventaireService.getPiecesDisponibles().subscribe(p => {
        this.availablePieces = p;
        this.filteredPieces = p;
      });
    }
  }

  createAudit(): void {
    let affects: any[] = [];

    if (this.newReq.type === 'PARTIEL_CATEGORIE' && this.targetCatId != 0) {
      affects = this.availablePieces
        .filter(p => p.categorie?.id == this.targetCatId)
        .map(p => ({ pieceId: p.id, responsableId: null }));
    } else {
      affects = Object.entries(this.assigns)
        .map(([pId, rId]) => ({ pieceId: Number(pId), responsableId: rId }))
        .filter(a => a.pieceId);
    }

    if (affects.length === 0 && this.newReq.type !== 'TOTAL') {
      this.notify("Veuillez sélectionner une catégorie valide.", 'error');
      return;
    }

    const req = { ...this.newReq, affectations: affects };
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

  autoSave(): void {
    if (!this.currentAudit || this.isSaving) return;
    this.isSaving = true;
    this.inventaireService.update(this.currentAudit.id!, this.currentAudit)
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.lastSaved = new Date();
        },
        error: () => this.isSaving = false
      });
  }

  validateAudit(): void {
    if (!this.currentAudit?.id) return;
    this.inventaireService.valider(this.currentAudit.id).subscribe(() => {
      this.notify("Audit validé. Réconcilliation terminée.", 'success');
      this.refreshHub();
      this.selectAudit(this.currentAudit!);
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
    this.inventaireService.validerLigne(this.currentAudit.id, l.id).subscribe({
      next: (inv) => {
        this.currentAudit = inv;
        this.notify('Ligne validée', 'success');
      },
      error: () => this.notify('Erreur de validation', 'error')
    });
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
    this.inventaireService.refuserLigne(this.currentAudit.id, l.id).subscribe({
      next: (inv: Inventaire) => {
        this.currentAudit = inv;
        this.notify('Ligne refusée (justification incorrecte)', 'error');
      },
      error: () => this.notify('Erreur lors du refus', 'error')
    });
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
