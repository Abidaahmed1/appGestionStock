import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ProduitFini, PieceDetachee } from '../../models/magasinier.models';
import { MagasinierService } from '../../services/magasinier.service';

@Component({
  selector: 'app-produit-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './produit-form.component.html',
  styleUrl: './produit-form.component.css'
})
export class ProduitFormComponent implements OnInit, OnChanges {
  @Input() showModal: boolean = false;
  @Input() selectedProduit: ProduitFini | null = null;
  @Input() parametres: any = null;
  @Input() allPieces: PieceDetachee[] = [];
  @Input() isSaving: boolean = false;
  
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ produit: ProduitFini, file: File | null }>();

  newProduit: ProduitFini = this.initNewProduit();
  imagePreview: string | null = null;
  selectedFile: File | null = null;
  isAutoCode = true;
  submitted = false;

  private cdr = inject(ChangeDetectorRef);
  private magasinierService = inject(MagasinierService);

  // Pieces management
  productPieces: PieceDetachee[] = [];
  showPieceSelector = false;
  pieceSearchTerm = '';
  filteredPieces: PieceDetachee[] = [];

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['showModal'] && this.showModal) {
      if (this.selectedProduit) {
        this.newProduit = { ...this.selectedProduit };
        this.productPieces = this.selectedProduit.pieces ? [...this.selectedProduit.pieces] : [];
        this.imagePreview = this.selectedProduit.imageUrl || null;
        this.isAutoCode = false; 
      } else {
        this.newProduit = this.initNewProduit();
        this.productPieces = [];
        this.imagePreview = null;
        this.isAutoCode = this.isModuleAuto('PRODUIT');
      }
      this.selectedFile = null;
      this.submitted = false;
      this.filteredPieces = [...this.allPieces];
    }
    if (changes['allPieces']) {
      this.filteredPieces = [...this.allPieces];
    }
  }

  initNewProduit(): ProduitFini {
    return {
      code: 'AUTO',
      designation: '',
      pieces: [],
      estArchivee: false,
      imageUrl: ''
    };
  }

  isModuleAuto(moduleName: string): boolean {
    if (!this.parametres?.numerotationConfigs) return true;
    const config = this.parametres.numerotationConfigs.find((c: any) => c.module === moduleName);
    return config ? config.automatique !== false : true;
  }

  getPrefix(moduleName: string): string {
    if (!this.parametres?.numerotationConfigs) return '';
    const config = this.parametres.numerotationConfigs.find((c: any) => c.module === moduleName);
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
    const config = this.parametres?.numerotationConfigs?.find((c: any) => c.module === moduleName);
    const prefix = config?.prefix || '';
    let parts = [];
    if (prefix.includes('%YYYY%')) parts.push("l'année sur 4 chiffres");
    else if (prefix.includes('%YY%')) parts.push("l'année sur 2 chiffres");
    if (prefix.includes('%MM%')) parts.push("le mois sur 2 chiffres");
    if (prefix.includes('%DD%')) parts.push("le jour sur 2 chiffres");
    if (parts.length > 0) return `Le numéro inclut ${parts.join(', ')}.`;
    return 'Séquence simple.';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  getImageUrl(url: string | null): string {
    if (!url) return 'assets/images/default-produit.png';
    if (url.startsWith('data:')) return url;
    if (url.startsWith('http')) return url;
    return `http://localhost:8080/api/produits/images/${url}`;
  }

  onSubmit(form: NgForm) {
    this.submitted = true;
    if (form.valid) {
      if (this.isAutoCode && !this.selectedProduit) {
        this.newProduit.code = 'AUTO';
      }
      // Sync pieces
      this.newProduit.pieces = this.productPieces;
      this.save.emit({ produit: this.newProduit, file: this.selectedFile });
    }
  }

  // Pieces methods
  togglePieceSelection(piece: PieceDetachee) {
    const idx = this.productPieces.findIndex(p => p.id === piece.id);
    if (idx === -1) {
      this.productPieces.push(piece);
    } else {
      this.productPieces.splice(idx, 1);
    }
    this.cdr.detectChanges();
  }

  isPieceSelected(pieceId?: number): boolean {
    return this.productPieces.some(p => p.id === pieceId);
  }

  removePiece(index: number) {
    this.productPieces.splice(index, 1);
    this.cdr.detectChanges();
  }

  onPieceSearch() {
    const term = this.pieceSearchTerm.toLowerCase().trim();
    this.filteredPieces = term 
      ? this.allPieces.filter(p => p.designation.toLowerCase().includes(term) || p.reference.toLowerCase().includes(term))
      : [...this.allPieces];
    this.cdr.detectChanges();
  }

  onCancel() {
    this.close.emit();
  }
}
