import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LogistiqueService } from '../../services/logistique.service';
import { BonCommandeFournisseur, Fournisseur, LigneCommande, StatutCommande, PieceFournisseur } from '../../models/logistique.models';
import { MagasinierService } from '../../../magasinier/services/magasinier.service';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';

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

  commande: BonCommandeFournisseur = {
    numeroCmd: 0,
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

  isPrintView = false;
  private afterPrintListener: (() => void) | null = null;

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadFournisseurs();
      this.loadPieces();
      this.loadEntreprise();

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
              // Already loaded from draft
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
            // Initialize a NEW order with the calculated sequence
            this.commande = this.initNewCommande();
          }
        }
        this.cdr.detectChanges();
      });
    }
  }

  initNewCommande(): BonCommandeFournisseur {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;

    return {
      numeroCmd: 0,
      dateCmd: formattedDate,
      dateArrivee: '',
      fournisseur: null as any,
      statut: StatutCommande.EN_ATTENTE,
      lignes: []
    };
  }

  loadFournisseurs() {
    this.logistiqueService.getAllFournisseurs().subscribe(data => {
      this.fournisseurs = data;
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
    const exploded: any[] = [];
    pieces.forEach(p => {
      if (p.details && p.details.length > 0) {
        p.details.forEach((detail: any) => {
          const attributes = detail.attributs || {};
          const variantLabel = Object.entries(attributes)
            .filter(([key, value]) => !key.startsWith('_') && value !== null && value !== '' && String(value).trim() !== '')
            .map(([_, value]) => value)
            .join(' - ');

          exploded.push({
            ...p,
            designation: `${p.designation} [${variantLabel}]`,
            detailPiece: detail,
            originalPiece: p
          });
        });
      } else {
        exploded.push(p);
      }
    });
    return exploded;
  }

  loadEntreprise() {
    this.entrepriseService.getAllEntreprises().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.entreprise = data[0];
          this.cdr.detectChanges();
        }
      }
    });
  }

  loadCommande(id: number) {
    this.loading = true;
    this.logistiqueService.getCommandeFournisseurById(id).subscribe({
      next: (data) => {
        this.commande = data;
        // Format dates for datetime-local and date inputs
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
          }, 800);
        }
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/logistique/commandes']);
      }
    });
  }

  loadPieceFournisseurs(fournisseurId: number) {
    this.logistiqueService.getPieceFournisseursByFournisseur(fournisseurId).subscribe(data => {
      this.pieceFournisseurs = data;
      this.updateLinesFromCatalog();
    });
  }

  updateLinesFromCatalog() {
    if (!this.commande.lignes || !this.pieceFournisseurs || this.pieceFournisseurs.length === 0) return;

    const now = new Date();
    this.commande.lignes.forEach(ligne => {
      if (ligne.piece) {
        const catalogEntry = this.pieceFournisseurs.find(pf =>
          pf.piece.id === ligne.piece.id &&
          (!pf.dateDebutValidite || new Date(pf.dateDebutValidite) <= now) &&
          (!pf.dateFinValidite || new Date(pf.dateFinValidite) >= now)
        );

        if (catalogEntry) {
          // On met à jour le prix et la remise seulement si c'est une commande en attente
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

  addLigne() {
    if (!this.commande.lignes) this.commande.lignes = [];
    this.commande.lignes.push({ piece: null, qteCmd: 1, prixAchat: 1, taxe: 19, remise: 0 });
    this.cdr.detectChanges();
  }

  removeLigne(index: number) {
    this.commande.lignes?.splice(index, 1);
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
      this.filteredPieces = this.pieces.slice(0, 10);
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

    const existingIndex = this.commande.lignes.findIndex((l, idx) => l.piece?.id === piece.id && idx !== index);
    if (existingIndex !== -1) {
      this.commande.lignes[existingIndex].qteCmd += this.commande.lignes[index].qteCmd;
      this.commande.lignes.splice(index, 1);
      this.validate();
      this.closeDropdown();
      return;
    }

    const ligne = this.commande.lignes[index];
    ligne.piece = piece.originalPiece || piece;
    ligne.detailPiece = piece.detailPiece || null;

    ligne.qteCmd = this.calculateRecommendedQuantity(piece, index);

    if (this.commande.fournisseur) {
      this.updateLinesFromCatalog();
    }

    this.validate();
    this.closeDropdown();
  }

  getTotalPieceStock(piece: any, detailPieceId?: number): number {
    const p = piece.originalPiece || piece;

    // Si une variante spécifique est demandée
    if (detailPieceId && p.details && p.details.length > 0) {
      const detail = p.details.find((d: any) => d.id === detailPieceId);
      if (detail) return detail.stock?.quantite || 0;
    }

    // Sinon, calcul du total global (fallback ou produit sans variante)
    let total = 0;
    if (p.stocks && Array.isArray(p.stocks)) {
      total = p.stocks.reduce((sum: number, s: any) => sum + (s.quantite || 0), 0);
    } else if (p.details && p.details.length > 0) {
      total = p.details.reduce((sum: number, dp: any) => sum + (dp.stock?.quantite || 0), 0);
    }

    if (total === 0 && p.stock?.quantite) {
      total = p.stock.quantite;
    }
    return total;
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
    if (!ligne || !ligne.detailPiece) return '';

    const attributes = ligne.detailPiece.attributs || {};

    const rawName = (attributes as any).nom || (attributes as any).name || '';
    const variantName = typeof rawName === 'string' ? rawName.trim() : String(rawName || '').trim();

    const detailParts = Object.entries(attributes)
      .filter(([key, value]) =>
        !key.startsWith('_') &&
        key !== 'nom' &&
        key !== 'name' &&
        value !== null &&
        value !== '' &&
        String(value).trim() !== ''
      )
      .map(([key, value]) => {
        const label = key
          .replace(/^_+/, '')
          .replace(/_/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase()
          .replace(/^\w/, c => c.toUpperCase());
        return `${label}: ${value}`;
      });

    const details = detailParts.join(' - ');

    if (variantName && details) {
      return `${variantName} — ${details}`;
    }
    if (variantName) {
      return variantName;
    }
    return details;
  }

  getPieceDesignation(ligne: any): string {
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
          return (!start || start <= orderDate) && (!end || end >= orderDate);
        }).sort((a, b) => {
          if (a.estPrincipale && !b.estPrincipale) return -1;
          if (!a.estPrincipale && b.estPrincipale) return 1;
          return (a.prixAchat || 0) - (b.prixAchat || 0); // Then by price
        });
        this.cdr.detectChanges();
      });
    }
  }

  getComparisonForPiece(pieceId: number): PieceFournisseur[] {
    return this.allPieceFournisseurs.filter(pf => pf.piece.id === pieceId);
  }

  switchTab(tab: 'produits' | 'autres') {
    this.activeTab = tab;
    if (tab === 'autres') {
      this.loadComparisonData();
    }
  }

  validate(): boolean {
    this.errors = {};
    this.formSubmitted = true;

    if (!this.commande.fournisseur?.id) {
      this.errors['fournisseur'] = 'Le fournisseur est obligatoire.';
    }

    if (this.commande.dateArrivee && this.commande.dateCmd) {
      const dateCmd = new Date(this.commande.dateCmd);
      const dateArrivee = new Date(this.commande.dateArrivee);
      if (dateArrivee <= dateCmd) {
        this.errors['dateArrivee'] = 'La date d\'arrivée prévue doit être postérieure à la date de commande.';
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
          const devise = this.entreprise?.devise?.symbole || 'DT';
          this.errors[`ligne_${i}_prix_zero`] = `Ligne ${i + 1} (${ligne.piece?.designation}) : le prix unitaire est à 0 ${devise}, veuillez le saisir.`;
        }


        if (ligne.piece && ligne.piece.seuilMaximum) {
          const pieceId = ligne.piece.id || ligne.piece;
          const detailPieceId = ligne.detailPiece?.id || ligne.detailPiece;

          const currentStock = this.getTotalPieceStock(ligne.piece, detailPieceId);
          const pendingInOthers = this.getPiecePendingQty(pieceId, detailPieceId);
          const otherLinesInCurrent = this.getOtherLinesQtyForPiece(pieceId, detailPieceId, i);

          const totalAlreadyCounted = currentStock + pendingInOthers + otherLinesInCurrent;
          const availableCapacity = ligne.piece.seuilMaximum - totalAlreadyCounted;

          if (totalAlreadyCounted >= ligne.piece.seuilMaximum) {
            this.errors[`ligne_${i}_max`] = `Ligne ${i + 1} : Seuil maximum (${ligne.piece.seuilMaximum}) déjà atteint ou dépassé pour cette variante (Total actuel: ${totalAlreadyCounted}).`;
          } else if (ligne.qteCmd < 1) {
            this.errors[`ligne_${i}_qte`] = `Ligne ${i + 1} : la quantité doit être ≥ 1.`;
          } else if (ligne.qteCmd > availableCapacity) {
            this.errors[`ligne_${i}_max`] = `Ligne ${i + 1} : le seuil maximum (${ligne.piece.seuilMaximum}) sera dépassé pour cette variante. Capacité restante : ${availableCapacity}.`;
          }
        } else if (ligne.qteCmd < 1) {
          this.errors[`ligne_${i}_qte`] = `Ligne ${i + 1} : la quantité doit être ≥ 1.`;
        }
      });
    }

    return Object.keys(this.errors).length === 0;
  }

  save() {
    if (!this.isEditable) return;

    if (!this.validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Extremely clean payload - only IDs and primitive values
    const payload: any = {
      id: this.commande.id,
      numeroCmd: (this.commande.numeroCmd && this.commande.numeroCmd > 0) ? this.commande.numeroCmd : null,
      dateCmd: this.commande.dateCmd,
      dateArrivee: (this.commande.dateArrivee && this.commande.dateArrivee !== '') ? this.commande.dateArrivee : null,
      statut: this.commande.statut,
      fournisseur: { id: this.commande.fournisseur?.id },
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

    // Ensure dateCmd has seconds if it's in YYYY-MM-DDTHH:mm format
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
        // If the error message is just a string (like "Failed to read request")
        if (typeof err.error === 'string' || (err.error && err.error.message && !err.error.errors)) {
          this.errors = { global: err.error.message || err.error || 'Erreur lors de la lecture de la requête par le serveur.' };
        } else {
          // If it's a map of field errors
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
    window.print();
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
