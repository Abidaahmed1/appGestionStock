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
    // Format for datetime-local: YYYY-MM-DDTHH:mm
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

  get isEditable(): boolean {
    return this.commande.statut === StatutCommande.EN_ATTENTE;
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
      this.closeDropdown();
      return;
    }

    const ligne = this.commande.lignes[index];
    ligne.piece = piece.originalPiece || piece;
    ligne.detailPiece = piece.detailPiece || null;

    ligne.qteCmd = this.calculateRecommendedQuantity(piece);

    if (this.commande.fournisseur) {
      this.updateLinesFromCatalog();
    }

    this.closeDropdown();
  }

  calculateRecommendedQuantity(piece: any): number {
    if (!piece || !piece.seuilMaximum) return 1;


    const currentStock = piece.stock?.quantite || 0;

    const pendingQtyInOtherOrders = this.commandes
      .filter(c => c.statut === StatutCommande.EN_ATTENTE && c.id !== this.commande.id)
      .reduce((total, c) => {
        const pieceLines = c.lignes?.filter(l => (l.piece?.id || l.piece) === piece.id) || [];
        return total + pieceLines.reduce((sum, l) => sum + (l.qteCmd || 0), 0);
      }, 0);

    const recommended = piece.seuilMaximum - (currentStock + pendingQtyInOtherOrders);

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

  getPieceDesignation(ligne: any): string {
    if (!ligne || !ligne.piece) return '—';
    if (ligne.detailPiece) {
      const attributes = ligne.detailPiece.attributs || {};
      const variantLabel = Object.entries(attributes)
        .filter(([key, value]) => !key.startsWith('_') && value !== null && value !== '' && String(value).trim() !== '')
        .map(([_, value]) => value)
        .join(' - ');
      return `${ligne.piece.designation} [${variantLabel}]`;
    }
    return ligne.piece.designation;
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
          const currentStock = ligne.piece.stock?.quantite || 0;
          const pendingQty = this.commandes
            .filter(c => c.statut === StatutCommande.EN_ATTENTE && c.id !== this.commande.id)
            .reduce((total, c) => {
              const pieceLines = c.lignes?.filter(l => (l.piece?.id || l.piece) === ligne.piece.id) || [];
              return total + pieceLines.reduce((sum, l) => sum + (l.qteCmd || 0), 0);
            }, 0);

          const alreadyReachedMax = (currentStock + pendingQty) >= ligne.piece.seuilMaximum;

          if (alreadyReachedMax) {
            this.errors[`ligne_${i}_qte`] = `Ligne ${i + 1} : Stock maximum (${ligne.piece.seuilMaximum}) déjà atteint ou dépassé. Vous ne pouvez pas commander ce produit actuellement.`;
          } else if (ligne.qteCmd < 1) {
            this.errors[`ligne_${i}_qte`] = `Ligne ${i + 1} : la quantité doit être ≥ 1.`;
          } else if (currentStock + pendingQty + ligne.qteCmd > ligne.piece.seuilMaximum) {
            const availableSpace = ligne.piece.seuilMaximum - (currentStock + pendingQty);
            this.errors[`ligne_${i}_max`] = `Ligne ${i + 1} : le seuil maximum (${ligne.piece.seuilMaximum}) sera dépassé. Capacité restante (stock + autres commandes) : ${availableSpace}.`;
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

    const onSaved = () => {
      this.logistiqueService.commandeDraft = null;
      this.notify('Commande enregistrée avec succès !', 'success');
      setTimeout(() => {
        this.router.navigate(['/logistique/commandes']);
      }, 1500);
    };

    const onError = (err: any) => {
      if (err.status === 400 && err.error) {
        this.errors = err.error;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (err.status === 409) {
        this.errors['global'] = err.error?.message || 'Un enregistrement avec ces données existe déjà (contrainte d\'unicité). Vérifiez la liste des commandes ou réessayez.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        this.errors['global'] = 'Une erreur est survenue. Veuillez réessayer.';
        this.notify('Erreur lors de l\'enregistrement', 'error');
      }
      console.error('Save error', err);
    };

    if (this.isEditMode && this.commande.id) {
      this.logistiqueService.updateCommandeFournisseur(this.commande.id, this.commande).subscribe({
        next: onSaved, error: onError
      });
    } else {
      this.logistiqueService.createCommandeFournisseur(this.commande).subscribe({
        next: onSaved, error: onError
      });
    }
  }

  confirmCommande() {
    if (!this.isEditable) return;
    this.commande.statut = StatutCommande.EN_ATTENTE;
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
