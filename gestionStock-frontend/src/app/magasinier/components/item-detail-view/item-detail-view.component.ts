import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PieceDetachee, ProduitFini } from '../../models/magasinier.models';
import { Entreprise } from '../../../admin/models/entreprise.model';
import { LogistiqueService } from '../../../logistique/services/logistique.service';

@Component({
  selector: 'app-item-detail-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './item-detail-view.component.html',
  styleUrl: './item-detail-view.component.css'
})
export class ItemDetailViewComponent implements OnInit {
  @Input() item: any | null = null;
  @Input() entreprise: Entreprise | null = null;
  @Output() close = new EventEmitter<void>();

  activeTab: string = 'general';
  pieceSuppliers: any[] = [];
  private logistiqueService = inject(LogistiqueService);


  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeView(): void {
    this.close.emit();
  }

  setTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'suppliers' && this.item && this.isPiece(this.item)) {
      this.loadPieceSuppliers();
    }
  }

  loadPieceSuppliers(): void {
    if (!this.item) return;

    const pieceId = this.item.originalPiece?.id || this.item.id;
    if (!pieceId) return;

    this.logistiqueService.getPieceFournisseursByPieces([pieceId]).subscribe({
      next: (data) => {
        this.pieceSuppliers = data;
      },
      error: (err) => console.error('Error loading piece suppliers:', err)
    });
  }

  isPiece(item: any): boolean {
    return !!item && 'seuilMinimum' in item;
  }

  getPieceFromItem(item: any): PieceDetachee | null {
    if (!item) return null;
    return item as PieceDetachee;
  }

  hasVariants(piece: PieceDetachee | null): boolean {
    if (!piece) return false;
    return !!(piece.details && piece.details.length > 0 && !piece.variantDetail);
  }

  getGroupedAttributes(piece: PieceDetachee | null): { name: string, values: string[] }[] {
    if (!piece || !piece.details || piece.details.length === 0) return [];

    const attributeMap = new Map<string, Set<string>>();

    piece.details.forEach(detail => {
      const attrs = detail.attributs || {};
      Object.entries(attrs).forEach(([key, value]) => {
        if (key.startsWith('_') || value === null || value === '' || String(value).trim() === '') return;

        if (!attributeMap.has(key)) {
          attributeMap.set(key, new Set<string>());
        }
        attributeMap.get(key)!.add(String(value));
      });
    });

    return Array.from(attributeMap.entries()).map(([name, valueSet]) => ({
      name,
      values: Array.from(valueSet)
    }));
  }

  getVariantLabel(detail: any): string {
      if (!detail || !detail.attributs) return 'Standard';
      
      const parts: string[] = [];
      const keys = Object.keys(detail.attributs);
      
      for (const key of keys) {
          if (!key.startsWith('_')) {
              const val = detail.attributs[key];
              if (val) {
                  parts.push(val);
              }
          }
      }
      return parts.length > 0 ? parts.join(' - ') : 'Standard';
  }

  getImageUrl(url: string | null | undefined): string {
    const isPiece = this.isPiece(this.item);
    const defaultImage = isPiece ? 'assets/images/default-piece.svg' : 'assets/images/default-produit.svg';
    if (!url) return defaultImage;

    if (url.startsWith('data:image')) return url;
    if (url.startsWith('http')) return url;

    if (!url.includes('/') && url.length > 5) {
      return `http://localhost:8081/api/images/${url}`;
    }

    if (url.startsWith('/api/images') || url.startsWith('/uploads')) {
      return `http://localhost:8081${url}`;
    }

    if (url.includes('/remote.php/dav/files/')) {
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      return `http://localhost:8081/api/images/${filename}`;
    }

    return url;
  }

  getTotalStock(item: any): number {
    if (!item) return 0;
    if (this.isPiece(item)) {
      const piece = item as PieceDetachee;
      if (piece.stocks && Array.isArray(piece.stocks)) {
        return piece.stocks.reduce((sum: number, s: any) => sum + (s.quantite || 0), 0);
      }
      if (piece.details && piece.details.length > 0) {
        return piece.details.reduce((sum: number, dp: any) => sum + (dp.stock?.quantite || 0), 0);
      }
    }
    return 0;
  }

  getVariantStock(piece: PieceDetachee | null, attrName: string, attrVal: string): number {
    if (!piece || !piece.details) return 0;

    // Find details that match this specific attribute/value combination
    const matchingDetails = piece.details.filter(d =>
      d.attributs && d.attributs[attrName] === attrVal
    );

    // Sum up the stock from these matching details
    return matchingDetails.reduce((sum, d) => sum + (d.stock?.quantite || 0), 0);
  }
}
