import { Component, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DocumentConfigService, DocumentDisplaySetting, DocumentType } from '../../../admin/services/document-config.service';
import { LogistiqueService } from '../../../logistique/services/logistique.service';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { ParametreService, Parametre } from '../../../admin/services/parametre.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './document-viewer.component.html',
  styleUrls: ['./document-viewer.component.css']
})
export class DocumentViewerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private docConfigService = inject(DocumentConfigService);
  private logistiqueService = inject(LogistiqueService);
  private entrepriseService = inject(EntrepriseService);
  private parametreService = inject(ParametreService);

  // Input if used as a child component
  @Input() type?: DocumentType;
  @Input() id?: number;

  // State
  documentType?: DocumentType;
  dataId?: number;
  
  // Data
  docData: any = null;
  config: DocumentDisplaySetting | null = null;
  entreprise: any = null;
  allVariantes: Parametre[] = [];
  
  loading = true;
  error: string | null = null;

  ngOnInit(): void {
    // Determine type and id from route or inputs
    const routeType = this.route.snapshot.queryParams['type'] as DocumentType;
    const routeId = this.route.snapshot.paramMap.get('id');

    this.documentType = this.type || routeType;
    // For command documents, if type is not specified in query, we can infer it or use it from route data
    if (!this.documentType && this.route.snapshot.data['docType']) {
        this.documentType = this.route.snapshot.data['docType'];
    }

    this.dataId = this.id || (routeId ? parseInt(routeId, 10) : undefined);

    if (this.dataId) {
        // If we don't have type yet, we might need to fetch the document first to find its type
        // But the router should ideally pass the type.
        // For Bons (ENTREE/SORTIE/RETOUR), we can try LogistiqueService.
        this.loadAllData();
    } else {
        this.error = "ID du document manquant.";
        this.loading = false;
    }

    this.loadVariantes();
  }

  loadVariantes(): void {
    this.parametreService.getCurrentParametres().pipe(
      catchError(() => of([]))
    ).subscribe(params => {
      this.allVariantes = (params || []).filter(p => p.variante && p.actif);
    });
  }

  loadAllData(): void {
    this.loading = true;
    this.error = null;

    const entreprise$ = this.entrepriseService.getCurrentEntreprise().pipe(catchError((err: any) => of(null as any)));
    
    // First fetch the document to know what it is (if type is missing)
    const data$ = this.fetchDocumentData(this.dataId!);

    forkJoin({
      data: data$,
      entreprise: entreprise$
    }).subscribe({
      next: (res) => {
        this.docData = res.data;
        this.entreprise = res.entreprise;
        
        if (!this.docData) {
          this.error = "Document non trouvé.";
          this.loading = false;
          return;
        }

        // Now that we have data, we can definitively know the type if it was missing
        if (!this.documentType) {
            this.documentType = this.inferTypeFromData(this.docData);
        }

        // Finally fetch config for this type
        this.docConfigService.getSettingByType(this.documentType!).subscribe({
            next: (conf) => {
                this.config = conf;
                this.loading = false;
            },
            error: () => {
                this.config = this.getDefaultConfig(this.documentType!);
                this.loading = false;
            }
        });
      },
      error: (err) => {
        this.error = "Erreur lors du chargement des données.";
        this.loading = false;
      }
    });
  }

  private fetchDocumentData(id: number) {
    // We try LogistiqueService (for Bons) first, or we check route
    // If route says it's a command, use logistiqueService.getCommandeFournisseurById
    const isCommandPath = this.router.url.includes('commande');
    
    if (isCommandPath || this.documentType === DocumentType.COMMANDE_FOURNISSEUR) {
        return this.logistiqueService.getCommandeFournisseurById(id).pipe(catchError((err: any) => of(null as any)));
    } else {
        return this.logistiqueService.getBonById(id).pipe(catchError((err: any) => of(null as any)));
    }
  }

  private inferTypeFromData(data: any): DocumentType {
    if (data.reference && !data.typeBon) return DocumentType.COMMANDE_FOURNISSEUR;
    if (data.typeBon === 'ENTREE') return DocumentType.BON_ENTREE;
    if (data.typeBon === 'SORTIE') return DocumentType.BON_SORTIE;
    if (data.typeBon === 'RETOUR') return DocumentType.BON_RETOUR;
    return DocumentType.BON_ENTREE;
  }

  private getDefaultConfig(type: DocumentType): DocumentDisplaySetting {
    return {
      documentType: type,
      primaryColor: '#0D9488',
      secondaryColor: '#1e293b',
      showLogo: true,
      showSignatureMagasinier: true,
      showSignatureClient: true,
      layout: 'MODERN',
      fontSize: 'MEDIUM',
      showPriceHT: true,
      showTVA: true,
      showDiscount: true,
      visibleVarianteIds: []
    };
  }

  getVariantValue(ligne: any, variantId: number): string | null {
    let rawValue: string | null = null;

    // 1. Sur certaines lignes (comme LigneCommande), un seul variant est sélectionné dans `detailPiece`
    if (ligne.detailPiece) {
      const paramId = ligne.detailPiece.parametre?.id || ligne.detailPiece.parametre;
      if (paramId == variantId) {
        rawValue = ligne.detailPiece.valeur;
      }
    }

    // 2. S'il n'y a pas de détail unique sélectionné, on cherche dans les détails du produit parent
    if (!rawValue) {
      const piece = ligne.piece || ligne.article;
      if (piece) {
        const details = piece.allDetails || piece.details || [];
        const detail = details.find((d: any) => (d.parametre?.id || d.parametre) == variantId);
        if (detail) rawValue = detail.valeur;
      }
    }

    // Validation stricte : si vide ou "-", on retourne null pour ne rien afficher du tout
    if (!rawValue || rawValue.trim() === '' || rawValue === '-') {
      return null;
    }

    return rawValue;
  }

  hasAnyVariant(ligne: any): boolean {
    if (!this.config?.visibleVarianteIds || this.config.visibleVarianteIds.length === 0) return false;
    return this.config.visibleVarianteIds.some(vid => !!this.getVariantValue(ligne, vid));
  }

  getVariantName(id: number): string {
    return this.allVariantes.find(v => v.id === id)?.nom || 'Attribut';
  }

  getLogoUrl(): string {
    if (this.entreprise?.logoUrl) {
      return this.entrepriseService.getImageUrl(this.entreprise.logoUrl);
    }
    return 'assets/images/logo-placeholder.png';
  }

  onLogoError(event: any): void {
    event.target.src = 'assets/images/logo-placeholder.png';
  }

  getTotalHT(): number {
    const lignes = this.docData?.mouvement?.ligneMouvement || this.docData?.lignes || this.docData?.lignesCommande || [];
    return lignes.reduce((acc: number, l: any) => {
      const qte = l.quantite || l.qteCmd || 0;
      const prix = l.prixHTVA || l.prixAchat || l.prixUnitaire || 0;
      const remise = (this.config?.showDiscount) ? (l.remise || 0) : 0;
      return acc + (qte * prix * (1 - remise / 100));
    }, 0);
  }

  getTotalTVA(): number {
    const lignes = this.docData?.mouvement?.ligneMouvement || this.docData?.lignes || this.docData?.lignesCommande || [];
    return lignes.reduce((acc: number, l: any) => {
      const qte = l.quantite || l.qteCmd || 0;
      const prix = l.prixHTVA || l.prixAchat || l.prixUnitaire || 0;
      const remise = (this.config?.showDiscount) ? (l.remise || 0) : 0;
      const tva = l.tauxTVA || l.taxe || 0;
      const ht = qte * prix * (1 - remise / 100);
      return acc + (ht * (tva / 100));
    }, 0);
  }

  getTotalTTC(): number {
    return this.getTotalHT() + this.getTotalTVA();
  }

  print(): void {
    window.print();
  }

  goBack(): void {
    window.history.back();
  }

  getDocTitle(): string {
    const type = this.documentType || this.inferTypeFromData(this.docData);
    switch(type) {
      case DocumentType.BON_ENTREE: return "BON DE RÉCEPTION (ENTRÉE)";
      case DocumentType.BON_SORTIE: return "BON DE LIVRAISON (SORTIE)";
      case DocumentType.BON_RETOUR: return "BON DE RETOUR";
      case DocumentType.COMMANDE_FOURNISSEUR: return "BON DE COMMANDE";
      default: return "DOCUMENT";
    }
  }
  
  getPartyLabel(isEmetteur: boolean): string {
    if (isEmetteur) return "ÉMETTEUR";
    const type = this.documentType || this.inferTypeFromData(this.docData);
    if (type === DocumentType.COMMANDE_FOURNISSEUR || type === DocumentType.BON_ENTREE) {
      return "FOURNISSEUR";
    }
    return "DESTINATAIRE / CLIENT";
  }

  calculateTotalLigne(ligne: any): number {
    const prix = ligne.prixHTVA || ligne.prixAchat || ligne.prixUnitaire || 0;
    const qte = ligne.quantite || ligne.qteCmd || 0;
    const tva = (this.config?.showTVA) ? (ligne.tauxTVA || ligne.taxe || 0) : 0;
    const remise = (this.config?.showDiscount) ? (ligne.remise || 0) : 0;
    
    const ht = prix * qte;
    const avecRemise = ht * (1 - remise / 100);
    const avecTva = avecRemise * (1 + tva / 100);
    
    return avecTva;
  }
  
  get currencySymbol(): string {
      return this.entrepriseService.getDeviseSymbol(this.entreprise);
  }
}
