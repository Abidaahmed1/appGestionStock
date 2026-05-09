import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LogistiqueService } from '../../services/logistique.service';
import { BonCommandeFournisseur, Fournisseur, LigneCommande, StatutCommande, PieceFournisseur } from '../../models/logistique.models';
import { MagasinierService } from '../../../magasinier/services/magasinier.service';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';
import { DocumentConfigService, DocumentDisplaySetting, DocumentType } from '../../../admin/services/document-config.service';

@Component({
  selector: 'app-commande-fournisseur-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './commande-fournisseur-form.component.html',
  styleUrl: './commande-fournisseur-form.component.css'
})
export class CommandeFournisseurFormComponent implements OnInit {
  private logistiqueService = inject(LogistiqueService);
  private magasinierService = inject(MagasinierService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private entrepriseService = inject(EntrepriseService);
  private docConfigService = inject(DocumentConfigService);

  docSetting: DocumentDisplaySetting | null = null;

  commande: BonCommandeFournisseur = {
    numeroCmd: '',
    dateCmd: '',
    fournisseur: null as any,
    statut: StatutCommande.EN_ATTENTE,
    lignes: []
  };
  commandes: BonCommandeFournisseur[] = [];
  fournisseurs: Fournisseur[] = [];
  pieces: any[] = [];
  pieceFournisseurs: PieceFournisseur[] = [];
  allPieceFournisseurs: PieceFournisseur[] = [];

  activeTab: 'produits' | 'autres' = 'produits';
  isEditMode = false;
  loading = false;

  errors: { [key: string]: string } = {};
  formSubmitted = false;

  get isEditable(): boolean {
    return this.commande.statut === StatutCommande.EN_ATTENTE;
  }

  openDropdownIndex: number | null = null;
  pieceSearchText: string = '';
  filteredPieces: any[] = [];

  showSupplierDropdown = false;
  supplierSearchText: string = '';
  filteredFournisseurs: Fournisseur[] = [];
  entreprise: Entreprise | null = null;
  notification: { message: string, type: 'success' | 'error' } | null = null;
  isAutoNumeroCmd = true;
  parametres: any = null;

  get currencySymbol(): string {
    if (this.entreprise?.devise?.code) {
      return this.entreprise.devise.code;
    }
    return this.entrepriseService.getDeviseSymbol(this.entreprise);
  }

  isPrintView = false;
  private afterPrintListener: (() => void) | null = null;

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadFournisseurs();
      this.loadPieces();
      this.loadEntreprise();
      this.loadParametres();
      this.loadDocSetting();

      if (this.logistiqueService.commandeDraft) {
        this.commande = this.logistiqueService.commandeDraft;
        if (this.commande.fournisseur?.id) {
          this.loadPieceFournisseurs(this.commande.fournisseur.id);
        }
      }

      this.logistiqueService.getAllCommandesFournisseurs().subscribe(data => {
        this.commandes = data;

        const id = this.route.snapshot.paramMap.get('id');
        if (id && id !== 'nouvelle') {
          const numericId = parseInt(id, 10);
          if (!isNaN(numericId)) {
            if (this.isEditMode && this.commande.id === numericId) {
            } else {
              this.isEditMode = true;
              this.loadCommande(numericId);
            }
          } else {
            if (!this.logistiqueService.commandeDraft) {
              this.commande = this.initNewCommande();
            }
          }
        } else {
          if (!this.logistiqueService.commandeDraft) {
            this.commande = this.initNewCommande();
          }
        }
        this.cdr.detectChanges();
      });
    }
  }

  loadParametres() {
    this.magasinierService.getAllParametres().subscribe({
      next: (data) => {
        this.parametres = data || [];
        if (this.parametres.length > 0 && !this.isEditMode) {
          this.isAutoNumeroCmd = this.isModuleAuto('BON_COMMANDE');
          this.commande.numeroCmd = this.isAutoNumeroCmd ? 'AUTO' : '';
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur chargement paramètres:', err)
    });
  }

  isModuleAuto(moduleName: string): boolean {
    let configs: any[] = [];
    (this.parametres || []).forEach((p: any) => {
      if (p.numerotationConfigs) {
        configs = configs.concat(p.numerotationConfigs);
      }
    });
    const config = configs.find((c: any) => c.module === moduleName);
    return config ? config.automatique !== false : true;
  }

  getPrefix(moduleName: string): string {
    let configs: any[] = [];
    (this.parametres || []).forEach((p: any) => {
      if (p.numerotationConfigs) {
        configs = configs.concat(p.numerotationConfigs);
      }
    });
    const config = configs.find((c: any) => c.module === moduleName);
    let prefix = config?.prefix || '';
    if (prefix) {
      const date = new Date();
      prefix = prefix
        .replace('%YYYY%', date.getFullYear().toString())
        .replace('%YY%', date.getFullYear().toString().substring(2))
        .replace('%MM%', (date.getMonth() + 1).toString().padStart(2, '0'))
        .replace('%DD%', date.getDate().toString().padStart(2, '0'));
    }
    return prefix;
  }

  getFormatExplanation(moduleName: string): string {
    let configs: any[] = [];
    (this.parametres || []).forEach((p: any) => {
      if (p.numerotationConfigs) {
        configs = configs.concat(p.numerotationConfigs);
      }
    });
    const config = configs.find((c: any) => c.module === moduleName);
    const prefix = config?.prefix || '';

    let parts = [];
    if (prefix.includes('%YYYY%')) parts.push("l'année sur 4 chiffres");
    else if (prefix.includes('%YY%')) parts.push("l'année sur 2 chiffres");

    if (prefix.includes('%MM%')) parts.push("le mois sur 2 chiffres");
    if (prefix.includes('%DD%')) parts.push("le jour sur 2 chiffres");

    if (parts.length > 0) {
      return `Astuce : Le numéro inclut ${parts.join(', ')} suivis d'une séquence.`;
    }
    return 'Séquence simple (sans date)';
  }

  initNewCommande(): BonCommandeFournisseur {
    return {
      numeroCmd: this.isAutoNumeroCmd ? 'AUTO' : '',
      dateCmd: new Date().toISOString().substring(0, 16),
      statut: StatutCommande.EN_ATTENTE,
      lignes: []
    } as BonCommandeFournisseur;
  }

  toggleAutoNumeroCmd(val: boolean): void {
    this.isAutoNumeroCmd = val;
    if (val) {
      this.commande.numeroCmd = 'AUTO';
    } else if (this.commande.numeroCmd === 'AUTO') {
      this.commande.numeroCmd = '';
    }
    this.cdr.detectChanges();
  }

  loadFournisseurs() {
    this.logistiqueService.getAllFournisseurs().subscribe(data => {
      // Filtrage robuste : on ne garde que ceux qui n'ont PAS archivee à true
      this.fournisseurs = data ? data.filter(f => f && f.archivee !== true) : [];
      this.cdr.detectChanges();
    });
  }

  loadPieces() {
    this.magasinierService.getPieces().subscribe(data => {
      this.pieces = this.explodePieces(data);
      this.cdr.detectChanges();
    });
  }

  explodePieces(pieces: any[]): any[] {
    return pieces.map(p => {
      const rootDesignation = p.designation;
      const visibleVariants = this.getFilteredVariantsForPiece(p);
      const variantLabel = visibleVariants.join(' ');

      return {
        ...p,
        aggregatedDesignation: rootDesignation,
        designation: variantLabel ? `${rootDesignation} - ${variantLabel}` : rootDesignation,
        originalPiece: p
      };
    });
  }

  loadEntreprise() {
    this.entrepriseService.getCurrentEntreprise().subscribe({
      next: (data) => {
        this.entreprise = data;
        this.cdr.detectChanges();
      },
      error: () => {
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

  loadCommande(id: number) {
    this.loading = true;
    this.logistiqueService.getCommandeFournisseurById(id).subscribe({
      next: (data) => {
        this.commande = data;
        this.isAutoNumeroCmd = this.commande.numeroCmd === 'AUTO';
        this.isEditMode = true;
        if (this.commande.dateCmd) {
          this.commande.dateCmd = this.commande.dateCmd.substring(0, 16);
        }
        if (this.commande.dateArrivee) {
          this.commande.dateArrivee = this.commande.dateArrivee.substring(0, 10);
        }
        if (this.commande.fournisseur?.id) {
          this.loadPieceFournisseurs(this.commande.fournisseur.id);
        }
        if (this.commande.lignes) {
          this.commande.lignes.forEach(l => {
            if (l.taxe === undefined || l.taxe === null) l.taxe = 19;
            if (l.remise === undefined || l.remise === null) l.remise = 0;
          });
        }
        this.loading = false;
        this.cdr.detectChanges();
        if (this.route.snapshot.queryParamMap.get('print') === '1' && this.commande.statut !== StatutCommande.ANNULEE) {
          this.isPrintView = true;
          this.cdr.detectChanges();
          setTimeout(() => {
            window.print();
            this.afterPrintListener = () => {
              this.goBackToCommandList();
            };
            window.addEventListener('afterprint', this.afterPrintListener);
          }, 1200);
        }
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/logistique/commandes']);
      }
    });
  }

  loadDocSetting() {
    this.docConfigService.getSettingByType(DocumentType.COMMANDE_FOURNISSEUR).subscribe({
      next: (setting) => {
        this.docSetting = setting;
        if (this.pieces.length > 0) {
          const rawPieces = this.pieces.map(p => p.originalPiece || p);
          this.pieces = this.explodePieces(rawPieces);
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur chargement doc settings:', err)
    });
  }

  getFilteredVariantsForPiece(piece: any): string[] {
    if (!piece) return [];
    const details = piece.allDetails || piece.details || [];

    if (this.docSetting && this.docSetting.visibleVarianteIds && this.docSetting.visibleVarianteIds.length > 0) {
      return details
        .filter((d: any) => {
          const hasValue = d.valeur && d.valeur.trim() !== '' && d.valeur !== '-';
          return d.parametre && d.parametre.id && hasValue && this.docSetting!.visibleVarianteIds.includes(d.parametre.id!);
        })
        .map((d: any) => `${d.parametre.nom}: ${d.valeur}`);
    }

    return [];
  }

  getPieceDisplayValueByLigne(ligne: any): string {
    const root = this.getPieceRootName(ligne);
    if (root === '—') return '—';

    const variants = this.getFilteredVariantsForPiece(ligne.piece);
    return variants.length > 0 ? `${root} - ${variants.join(' ')}` : root;
  }

  loadPieceFournisseurs(fournisseurId: number) {
    this.logistiqueService.getPieceFournisseursByFournisseur(fournisseurId).subscribe(data => {
      this.pieceFournisseurs = data;
      this.updateLinesFromCatalog();
      this.calculateExpectedArrival();
    });
  }

  calculateExpectedArrival() {
    if (!this.commande || !this.commande.dateCmd || !this.isEditable) return;

    let maxDays = 0;
    const now = new Date();
    const currentLines = this.commande.lignes || [];

    if (currentLines.length > 0) {
      currentLines.forEach(ligne => {
        if (ligne && ligne.piece) {
          const pieceId = ligne.piece.id || (typeof ligne.piece === 'number' ? ligne.piece : (ligne.piece as any).id);
          if (pieceId && this.pieceFournisseurs) {
            const catalogEntry = this.pieceFournisseurs.find(pf =>
              pf && pf.piece && (pf.piece.id || pf.piece) === pieceId &&
              (!pf.dateDebutValidite || new Date(pf.dateDebutValidite) <= now) &&
              (!pf.dateFinValidite || new Date(pf.dateFinValidite) >= now) &&
              (ligne.qteCmd >= (pf.qteMinACommander || 1))
            );
            if (catalogEntry && catalogEntry.nbJoursLivraison > maxDays) {
              maxDays = catalogEntry.nbJoursLivraison;
            }
          }
        }
      });
    }

    if (maxDays > 0) {
      try {
        const baseDate = new Date(this.commande.dateCmd);
        if (!isNaN(baseDate.getTime())) {
          const arrival = new Date(baseDate.getTime() + (maxDays * 24 * 60 * 60 * 1000));
          const year = arrival.getFullYear();
          const month = (arrival.getMonth() + 1).toString().padStart(2, '0');
          const day = arrival.getDate().toString().padStart(2, '0');
          this.commande.dateArrivee = `${year}-${month}-${day}`;
        }
      } catch (e) {
        console.error('Error calculating date', e);
      }
    }
    this.cdr.detectChanges();
  }

  updateLinesFromCatalog() {
    if (!this.commande.lignes || !this.pieceFournisseurs || this.pieceFournisseurs.length === 0) return;

    const now = new Date();
    this.commande.lignes.forEach(ligne => {
      if (ligne.piece) {
        const pieceId = ligne.piece.id || (typeof ligne.piece === 'number' ? ligne.piece : (ligne.piece as any).id);
        const catalogEntry = this.pieceFournisseurs.find(pf =>
          (pf.piece.id || pf.piece) === pieceId &&
          (!pf.dateDebutValidite || new Date(pf.dateDebutValidite) <= now) &&
          (!pf.dateFinValidite || new Date(pf.dateFinValidite) >= now) &&
          (ligne.qteCmd >= (pf.qteMinACommander || 1))
        );

        if (catalogEntry) {
          if (this.isEditable) {
            ligne.prixAchat = catalogEntry.prixAchat;
            ligne.remise = catalogEntry.tauxRemise || 0;
            ligne.taxe = 19;
          }
        }
      }
    });
    this.cdr.detectChanges();
  }

  onQuantityChange(index: number) {
    this.updateLinesFromCatalog();
    this.calculateExpectedArrival();
  }

  addLigne() {
    if (!this.commande.lignes) this.commande.lignes = [];
    this.commande.lignes.push({ piece: null, qteCmd: 1, prixAchat: 0, taxe: 19, remise: 0 });
    this.cdr.detectChanges();
  }

  removeLigne(index: number) {
    this.commande.lignes?.splice(index, 1);
    this.calculateExpectedArrival();
    this.cdr.detectChanges();
  }

  toggleDropdown(index: number, event: Event) {
    if (!this.isEditable) return;
    event.stopPropagation();
    if (this.openDropdownIndex === index) {
      this.closeDropdown();
    } else {
      this.openDropdownIndex = index;
      const piece = this.commande.lignes?.[index].piece;
      this.pieceSearchText = piece ? piece.designation : '';
      this.filterPieces();
    }
  }

  filterPieces() {
    if (!this.pieceSearchText) {
      // Par défaut : pièces en rupture (<=0) ou en réserve (sous le seuil minimum)
      this.filteredPieces = this.pieces.filter(p => {
        const root = p.originalPiece || p;
        const qty = root.quantite || 0;
        const min = root.seuilMinimum || 1;
        return qty <= min;
      });

      if (this.filteredPieces.length < 5) {
        const others = this.pieces.filter(p => !this.filteredPieces.includes(p)).slice(0, 10 - this.filteredPieces.length);
        this.filteredPieces = [...this.filteredPieces, ...others];
      } else {
        this.filteredPieces = this.filteredPieces.slice(0, 10);
      }
    } else {
      const search = this.pieceSearchText.toLowerCase();
      this.filteredPieces = this.pieces.filter(p =>
        p.designation.toLowerCase().includes(search) ||
        (p.reference && p.reference.toLowerCase().includes(search))
      ).slice(0, 10);
    }
  }

  selectPiece(index: number, piece: any) {
    if (!this.commande.lignes) return;

    const pieceIdObj = piece.originalPiece ? piece.originalPiece.id : piece.id;
    const detailIdObj = piece.detailPiece?.id || null;

    const existingIndex = this.commande.lignes.findIndex((l, idx) => {
      const matchingPiece = (l.piece?.id || l.piece) === pieceIdObj;
      const matchingDetail = (l.detailPiece?.id || null) === detailIdObj;
      return matchingPiece && matchingDetail && idx !== index;
    });

    if (existingIndex !== -1) {
      this.commande.lignes[existingIndex].qteCmd += this.commande.lignes[index].qteCmd;
      this.commande.lignes.splice(index, 1);
      this.closeDropdown();
      return;
    }

    const ligne = this.commande.lignes[index];
    ligne.piece = piece.originalPiece || piece;
    ligne.detailPiece = piece.detailPiece || null;
    (ligne as any).transientDesignation = piece.designation;

    ligne.qteCmd = this.calculateRecommendedQuantity(piece, index);

    if (this.commande.fournisseur) {
      this.updateLinesFromCatalog();
    }

    this.calculateExpectedArrival();
    this.closeDropdown();
  }

  getTotalPieceStock(piece: any, detailPieceId?: number): number {
    const p = piece.originalPiece || piece;
    return p.quantite || 0;
  }

  getPiecePendingQty(pieceId: number, detailPieceId?: number): number {
    return this.commandes
      .filter(c => c.statut === StatutCommande.EN_ATTENTE && c.id !== this.commande.id)
      .reduce((total, c) => {
        const pieceLines = c.lignes?.filter(l => {
          const matchesPiece = (l.piece?.id || l.piece) === pieceId;
          if (!detailPieceId) return matchesPiece;
          const matchesDetail = (l.detailPiece?.id || l.detailPiece) === detailPieceId;
          return matchesPiece && matchesDetail;
        }) || [];
        return total + pieceLines.reduce((sum, l) => sum + (l.qteCmd || 0), 0);
      }, 0);
  }

  getOtherLinesQtyForPiece(pieceId: number, detailPieceId: number | undefined, currentLineIndex: number): number {
    return this.commande.lignes?.reduce((total, l, idx) => {
      if (idx !== currentLineIndex) {
        const matchesPiece = (l.piece?.id || l.piece) === pieceId;
        const matchesDetail = (l.detailPiece?.id || l.detailPiece) === (detailPieceId || undefined);
        if (matchesPiece && matchesDetail) {
          return total + (l.qteCmd || 0);
        }
      }
      return total;
    }, 0) || 0;
  }

  calculateRecommendedQuantity(piece: any, lineIndex: number = -1): number {
    if (!piece || !piece.seuilMaximum) return 1;

    const pieceId = piece.id || piece.originalPiece?.id;
    const detailPieceId = piece.detailPiece?.id;

    const currentStock = this.getTotalPieceStock(piece, detailPieceId);
    const pendingQtyInOtherOrders = this.getPiecePendingQty(pieceId, detailPieceId);
    const qtyInCurrentOrderOtherLines = this.getOtherLinesQtyForPiece(pieceId, detailPieceId, lineIndex);

    const totalUsedOrPlanned = currentStock + pendingQtyInOtherOrders + qtyInCurrentOrderOtherLines;
    const recommended = piece.seuilMaximum - totalUsedOrPlanned;

    return recommended > 0 ? recommended : 0;
  }

  closeDropdown() {
    this.openDropdownIndex = null;
    this.pieceSearchText = '';
    this.showSupplierDropdown = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    this.closeDropdown();
  }

  onDropdownClick(event: MouseEvent) {
    event.stopPropagation();
  }

  toggleSupplierDropdown(event: Event) {
    if (!this.isEditable) return;
    event.stopPropagation();
    this.showSupplierDropdown = !this.showSupplierDropdown;
    if (this.showSupplierDropdown) {
      this.supplierSearchText = this.commande.fournisseur ? this.commande.fournisseur.nom : '';
      this.filterFournisseurs();
    }
  }

  filterFournisseurs() {
    if (!this.supplierSearchText) {
      this.filteredFournisseurs = this.fournisseurs.slice(0, 10);
    } else {
      const search = this.supplierSearchText.toLowerCase();
      this.filteredFournisseurs = this.fournisseurs.filter(f =>
        f.nom.toLowerCase().includes(search) ||
        (f.code && f.code.toLowerCase().includes(search))
      ).slice(0, 10);
    }
  }

  selectFournisseur(f: Fournisseur) {
    this.commande.fournisseur = f;
    this.showSupplierDropdown = false;

    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    this.commande.dateCmd = `${year}-${month}-${day}T${hours}:${minutes}`;

    if (f.id) {
      this.loadPieceFournisseurs(f.id);
    }
  }

  goToSupplier(id: number | undefined, event: Event) {
    if (id === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    this.logistiqueService.commandeDraft = this.commande;
    this.router.navigate(['/logistique/fournisseurs', id]);
  }

  getSupplierDisplayValue(): string {
    return this.showSupplierDropdown ? this.supplierSearchText : (this.commande.fournisseur ? this.commande.fournisseur.nom : '');
  }

  onSupplierSearchChange(value: string) {
    this.supplierSearchText = value;
    this.filterFournisseurs();
  }

  getPieceRootName(ligne: any): string {
    if (!ligne || !ligne.piece) return '—';
    return ligne.piece.designation || '—';
  }

  getPieceVariantDescription(ligne: any): string {
    if (!ligne || !ligne.piece) return '';
    const variants = this.getFilteredVariantsForPiece(ligne.piece);
    return variants.join(' ');
  }

  getPieceVariantArray(ligne: any): string[] {
    if (!ligne || !ligne.piece || !ligne.piece.details || !Array.isArray(ligne.piece.details)) return [];

    return ligne.piece.details
      .filter((d: any) => d.valeur && d.parametre)
      .map((d: any) => `${d.parametre.nom}: ${d.valeur}`);
  }

  getPieceDesignation(ligne: any): string {
    if (ligne.transientDesignation) return ligne.transientDesignation;

    const root = this.getPieceRootName(ligne);
    if (root === '—') return '—';

    const variant = this.getPieceVariantDescription(ligne);
    return variant ? `${root} - ${variant}` : root;
  }

  getPieceDisplayValue(index: number, ligne: any): string {
    if (this.openDropdownIndex === index) return this.pieceSearchText;
    return this.getPieceDesignation(ligne);
  }

  onPieceSearchChange(value: string) {
    this.pieceSearchText = value;
    this.filterPieces();
  }

  get totalBrut(): number {
    return this.commande.lignes?.reduce((acc, ligne) => acc + (ligne.qteCmd * (ligne.prixAchat || 0)), 0) || 0;
  }

  get totalRemise(): number {
    return this.commande.lignes?.reduce((acc, ligne) => {
      const brut = ligne.qteCmd * (ligne.prixAchat || 0);
      return acc + (brut * ((ligne.remise || 0) / 100));
    }, 0) || 0;
  }

  get totalHT(): number {
    return this.totalBrut - this.totalRemise;
  }

  get totalTaxe(): number {
    return this.commande.lignes?.reduce((acc, ligne) => {
      const brut = ligne.qteCmd * (ligne.prixAchat || 0);
      const htLine = brut * (1 - ((ligne.remise || 0) / 100));
      return acc + (htLine * ((ligne.taxe || 0) / 100));
    }, 0) || 0;
  }

  get totalTTC(): number {
    return this.totalHT + this.totalTaxe;
  }

  loadComparisonData() {
    const pieceIds = this.commande.lignes?.map(l => l.piece?.id).filter(id => id !== undefined) as number[];
    if (pieceIds && pieceIds.length > 0) {
      this.logistiqueService.getPieceFournisseursByPieces(pieceIds).subscribe(data => {
        const orderDate = this.commande.dateCmd ? new Date(this.commande.dateCmd) : new Date();
        this.allPieceFournisseurs = data.filter(pf => {
          const start = pf.dateDebutValidite ? new Date(pf.dateDebutValidite) : null;
          const end = pf.dateFinValidite ? new Date(pf.dateFinValidite) : null;
          // On exclut si le fournisseur est archivé
          const isSupplierArchived = pf.fournisseur && pf.fournisseur.archivee === true;
          return !isSupplierArchived && (!start || start <= orderDate) && (!end || end >= orderDate);
        }).sort((a, b) => {
          if (a.estPrincipale && !b.estPrincipale) return -1;
          if (!a.estPrincipale && b.estPrincipale) return 1;
          return (a.prixAchat || 0) - (b.prixAchat || 0); // Then by price
        });
        this.cdr.detectChanges();
      });
    }
  }

  getComparisonForPiece(pieceId: number, qteCmd: number): PieceFournisseur[] {
    const orderDate = this.commande.dateCmd ? new Date(this.commande.dateCmd) : new Date();

    return this.allPieceFournisseurs.filter(pf => {
      if (!pf || !pf.piece || !pf.fournisseur) return false;

      const pfPieceId = pf.piece.id || pf.piece;
      if (pfPieceId !== pieceId) return false;

      const minQty = pf.qteMinACommander || 1;
      if (qteCmd < minQty) return false;

      const start = pf.dateDebutValidite ? new Date(pf.dateDebutValidite) : null;
      const end = pf.dateFinValidite ? new Date(pf.dateFinValidite) : null;
      const isValidDate = (!start || start <= orderDate) && (!end || end >= orderDate);

      return isValidDate;
    });
  }

  switchTab(tab: 'produits' | 'autres') {
    this.activeTab = tab;
    if (tab === 'autres') {
      this.loadComparisonData();
    }
  }

  getMinDateArrivee(): string {
    if (!this.commande.dateCmd) return '';
    try {
      const dateCmd = new Date(this.commande.dateCmd);
      dateCmd.setDate(dateCmd.getDate() + 1);
      return dateCmd.toISOString().substring(0, 10);
    } catch {
      return '';
    }
  }

  validate(): boolean {
    this.errors = {};

    if (!this.commande.fournisseur?.id) {
      this.errors['fournisseur'] = 'Le fournisseur est obligatoire.';
    }

    if (!this.isAutoNumeroCmd) {
      if (!this.commande.numeroCmd || this.commande.numeroCmd.trim() === '') {
        this.errors['numeroCmd'] = 'Le numéro de commande est obligatoire en saisie manuelle.';
      } else if (!/^[A-Z0-9\-\/]+$/i.test(this.commande.numeroCmd)) {
        this.errors['numeroCmd'] = 'Format invalide : utilisez uniquement des lettres, chiffres, tirets (-) ou slash (/).';
      }
    }

    if (this.commande.dateArrivee && this.commande.dateCmd) {
      const dateCmd = new Date(this.commande.dateCmd);
      // On compare uniquement les dates sans l'heure
      const dateCmdOnly = new Date(dateCmd.getFullYear(), dateCmd.getMonth(), dateCmd.getDate());
      const dateArrivee = new Date(this.commande.dateArrivee);
      const dateArriveeOnly = new Date(dateArrivee.getFullYear(), dateArrivee.getMonth(), dateArrivee.getDate());

      if (dateArriveeOnly <= dateCmdOnly) {
        this.errors['dateArrivee'] = 'La date d\'arrivée prévue doit être strictement postérieure à la date de commande.';
      }
    }

    const lignes = this.commande.lignes || [];
    if (lignes.length === 0) {
      this.errors['lignes'] = 'La commande doit contenir au moins une ligne produit.';
    } else {
      lignes.forEach((ligne, i) => {
        if (!ligne.piece) {
          this.errors[`ligne_${i}_piece`] = `Ligne ${i + 1} : sélectionnez un produit.`;
        }
        if ((ligne.prixAchat || 0) < 0) {
          this.errors[`ligne_${i}_prix`] = `Ligne ${i + 1} : le prix ne peut pas être négatif.`;
        }
        if ((ligne.prixAchat || 0) === 0 && ligne.piece) {
          const devise = this.currencySymbol;
          this.errors[`ligne_${i}_prix_zero`] = `Ligne ${i + 1} (${ligne.piece?.designation}) : le prix unitaire est à 0 ${devise}, veuillez le saisir.`;
        }

        if (ligne.qteCmd < 1) {
          this.errors[`ligne_${i}_qte`] = `Ligne ${i + 1} : la quantité doit être ≥ 1.`;
        }
        if ((ligne.remise || 0) < 0) {
          this.errors[`ligne_${i}_remise`] = `Ligne ${i + 1} : la remise ne peut pas être négative.`;
        }
        if ((ligne.taxe || 0) < 0) {
          this.errors[`ligne_${i}_taxe`] = `Ligne ${i + 1} : la taxe ne peut pas être négative.`;
        }
      });
    }

    return Object.keys(this.errors).length === 0;
  }

  save() {
    if (!this.isEditable) return;

    this.formSubmitted = true;
    if (!this.validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const payload: any = {
      id: this.commande.id,
      numeroCmd: (this.commande.numeroCmd && String(this.commande.numeroCmd).trim() !== '' && String(this.commande.numeroCmd) !== '0') ? this.commande.numeroCmd : null,
      dateCmd: this.commande.dateCmd,
      dateArrivee: (this.commande.dateArrivee && this.commande.dateArrivee !== '') ? this.commande.dateArrivee : null,
      statut: this.commande.statut,
      fournisseur: { id: this.commande.fournisseur?.id },
      entreprise: this.entreprise?.id ? { id: this.entreprise.id } : null,
      lignes: this.commande.lignes?.map(l => ({
        id: l.id,
        qteCmd: l.qteCmd,
        prixAchat: l.prixAchat,
        taxe: l.taxe,
        remise: l.remise,
        piece: { id: l.piece?.id || l.piece },
        detailPiece: l.detailPiece?.id ? { id: l.detailPiece.id } : null
      }))
    };

    if (payload.dateCmd && payload.dateCmd.includes('T') && payload.dateCmd.split(':').length === 2) {
      payload.dateCmd = payload.dateCmd + ':00';
    } else if (payload.dateCmd && !payload.dateCmd.includes('T')) {
      payload.dateCmd = payload.dateCmd + 'T00:00:00';
    }

    const onSaved = () => {
      this.logistiqueService.commandeDraft = null;
      this.notify('Commande enregistrée avec succès !', 'success');
      setTimeout(() => {
        this.router.navigate(['/logistique/commandes']);
      }, 1500);
    };

    const onError = (err: any) => {
      this.loading = false;
      if (err.status === 400) {
        if (typeof err.error === 'string' || (err.error && err.error.message && !err.error.errors)) {
          this.errors = { global: err.error.message || err.error || 'Erreur lors de la lecture de la requête par le serveur.' };
        } else {
          this.errors = err.error || { global: 'Erreur de validation.' };
        }
      } else if (err.status === 409) {
        this.errors['global'] = err.error?.message || 'Un enregistrement avec ces données existe déjà (contrainte d\'unicité).';
      } else {
        this.errors['global'] = 'Une erreur est survenue lors de la communication avec le serveur (Status: ' + err.status + ').';
        this.notify('Erreur lors de l\'enregistrement', 'error');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      console.error('Save error', err);
    };

    this.loading = true;
    if (this.isEditMode && this.commande.id) {
      this.logistiqueService.updateCommandeFournisseur(this.commande.id, payload).subscribe({
        next: onSaved, error: onError
      });
    } else {
      this.logistiqueService.createCommandeFournisseur(payload).subscribe({
        next: onSaved, error: onError
      });
    }
  }

  confirmCommande() {
    if (!this.isEditable) return;
    this.save();
  }

  recevoirCommande() {
    if (!this.isEditable) return;
    this.commande.statut = StatutCommande.RECUE;
    this.save();
  }

  annulerCommande() {
    if (!this.isEditable) return;
    if (confirm('Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible.')) {
      this.commande.statut = StatutCommande.ANNULEE;
      this.save();
    }
  }

  printCommande() {
    if (this.commande.statut === StatutCommande.ANNULEE) return;
    if (this.commande.id) {
      this.router.navigate(['/document/preview', this.commande.id], { queryParams: { type: 'COMMANDE_FOURNISSEUR' } });
    } else {
      alert('Veuillez sauvegarder la commande avant de pouvoir l\'imprimer.');
    }
  }

  cancel() {
    this.logistiqueService.commandeDraft = null;
    this.router.navigate(['/logistique/commandes']);
  }

  goBackToCommandList() {
    if (this.afterPrintListener) {
      window.removeEventListener('afterprint', this.afterPrintListener);
      this.afterPrintListener = null;
    }
    this.router.navigate(['/logistique/commandes']);
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
