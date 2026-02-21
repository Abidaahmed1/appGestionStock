import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LogistiqueService } from '../../services/logistique.service';
import { BonCommandeFournisseur, Fournisseur, LigneCommande, StatutCommande, PieceFournisseur } from '../../models/logistique.models';
import { MagasinierService } from '../../../magasinier/services/magasinier.service';

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

  commande: BonCommandeFournisseur = {
    numeroCmd: 0,
    dateCmd: '', // Will be initialized in ngOnInit or init
    fournisseur: null as any,
    statut: StatutCommande.EN_ATTENTE,
    lignes: []
  };
  commandes: BonCommandeFournisseur[] = [];
  fournisseurs: Fournisseur[] = [];
  pieces: any[] = [];
  pieceFournisseurs: PieceFournisseur[] = [];

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

  /** Vue ouverte uniquement pour impression (paramètre print=1) : retour à la liste après impression/annulation. */
  isPrintView = false;
  private afterPrintListener: (() => void) | null = null;

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadFournisseurs();
      this.loadPieces();

      // Check for a temporary draft (if returning from Supplier details)
      if (this.logistiqueService.commandeDraft) {
        this.commande = this.logistiqueService.commandeDraft;
        if (this.commande.fournisseur?.id) {
          this.loadPieceFournisseurs(this.commande.fournisseur.id);
        }
        // Don't clear it yet, we might need it if the user navigates back again
      }

      // Load all orders to calculate the next sequence number correctly
      this.logistiqueService.getAllCommandesFournisseurs().subscribe(data => {
        this.commandes = data;

        const id = this.route.snapshot.paramMap.get('id');
        if (id && id !== 'nouvelle') {
          const numericId = parseInt(id, 10);
          if (!isNaN(numericId)) {
            // If we have a draft and it matches the ID, we already loaded it
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
      this.pieces = data;
      this.cdr.detectChanges();
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
        this.loading = false;
        this.cdr.detectChanges();
        if (this.route.snapshot.queryParamMap.get('print') === '1') {
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
    });
  }

  addLigne() {
    if (!this.commande.lignes) this.commande.lignes = [];
    this.commande.lignes.push({ piece: null, qteCmd: 1, prixAchat: 0, taxe: 19, remise: 0 });
    this.cdr.detectChanges();
  }

  removeLigne(index: number) {
    this.commande.lignes?.splice(index, 1);
    this.cdr.detectChanges();
  }

  // Searchable Dropdown methods
  toggleDropdown(index: number, event: Event) {
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

    // Check for duplicates (backend has unique constraint on piece_id + commande_id)
    const existingIndex = this.commande.lignes.findIndex((l, idx) => l.piece?.id === piece.id && idx !== index);
    if (existingIndex !== -1) {
      this.commande.lignes[existingIndex].qteCmd += this.commande.lignes[index].qteCmd;
      this.commande.lignes.splice(index, 1);
      this.closeDropdown();
      return;
    }

    const ligne = this.commande.lignes[index];
    ligne.piece = piece;

    // Auto-fill price and tax if exists in supplier catalog
    if (this.commande.fournisseur) {
      const now = new Date();
      const catalogEntry = this.pieceFournisseurs.find(pf =>
        pf.piece.id === piece.id &&
        (!pf.dateDebutValidite || new Date(pf.dateDebutValidite) <= now) &&
        (!pf.dateFinValidite || new Date(pf.dateFinValidite) >= now)
      );

      if (catalogEntry) {
        ligne.prixAchat = catalogEntry.prixAchat;
        ligne.taxe = 19;
        ligne.remise = catalogEntry.tauxRemise || 0;
      } else {
        ligne.taxe = 19;
        ligne.remise = 0;
      }
    }

    this.closeDropdown();
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

  // Supplier Searchable Dropdown
  toggleSupplierDropdown(event: Event) {
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

    // Auto-fill order date to current date
    const now = new Date();
    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    this.commande.dateCmd = `${year}-${month}-${day}T${hours}:${minutes}`;

    // Load supplier catalog for this specific fournisseur
    if (f.id) {
      this.loadPieceFournisseurs(f.id);
    }
  }

  goToSupplier(id: number | undefined, event: Event) {
    if (id === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    // Save current state as draft
    this.logistiqueService.commandeDraft = this.commande;
    this.router.navigate(['/logistique/fournisseurs', id]);
  }

  // Helper methods for template bindings to avoid NG5002 error
  getSupplierDisplayValue(): string {
    return this.showSupplierDropdown ? this.supplierSearchText : (this.commande.fournisseur ? this.commande.fournisseur.nom : '');
  }

  onSupplierSearchChange(value: string) {
    this.supplierSearchText = value;
    this.filterFournisseurs();
  }

  getPieceDisplayValue(index: number, ligne: any): string {
    return this.openDropdownIndex === index ? this.pieceSearchText : (ligne.piece ? ligne.piece.designation : '');
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

  validate(): boolean {
    this.errors = {};
    this.formSubmitted = true;

    if (!this.commande.fournisseur?.id) {
      this.errors['fournisseur'] = 'Le fournisseur est obligatoire.';
    }

    // Validation croisée des dates
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
        if (ligne.qteCmd < 1) {
          this.errors[`ligne_${i}_qte`] = `Ligne ${i + 1} : la quantité doit être ≥ 1.`;
        }
        if ((ligne.prixAchat || 0) < 0) {
          this.errors[`ligne_${i}_prix`] = `Ligne ${i + 1} : le prix ne peut pas être négatif.`;
        }
        if ((ligne.prixAchat || 0) === 0 && ligne.piece) {
          this.errors[`ligne_${i}_prix_zero`] = `Ligne ${i + 1} (${ligne.piece?.designation}) : le prix unitaire est à 0 DT, veuillez le saisir.`;
        }
      });
    }

    return Object.keys(this.errors).length === 0;
  }

  save() {
    if (!this.validate()) {
      // Scroll to top to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const onSaved = () => {
      this.logistiqueService.commandeDraft = null;
      this.router.navigate(['/logistique/commandes']);
    };

    const onError = (err: any) => {
      if (err.status === 400 && err.error) {
        // Backend validation errors: map field names to messages
        this.errors = err.error;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        this.errors['global'] = 'Une erreur est survenue. Veuillez réessayer.';
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
    this.commande.statut = StatutCommande.EN_ATTENTE;
    this.save();
  }

  printCommande() {
    window.print();
  }

  cancel() {
    this.logistiqueService.commandeDraft = null;
    this.router.navigate(['/logistique/commandes']);
  }

  /** Retour à la liste des commandes (après impression ou annulation, ou clic sur le bouton). */
  goBackToCommandList() {
    if (this.afterPrintListener) {
      window.removeEventListener('afterprint', this.afterPrintListener);
      this.afterPrintListener = null;
    }
    this.router.navigate(['/logistique/commandes']);
  }
}
