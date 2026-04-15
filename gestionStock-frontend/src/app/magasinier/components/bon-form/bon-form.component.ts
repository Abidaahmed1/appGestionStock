import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { LogistiqueService } from '../../../logistique/services/logistique.service';
import { Bon, TypeBon, Fournisseur, MouvementStock, TypeMouvement, LigneMouvement, Stock } from '../../../logistique/models/logistique.models';
import { MagasinierService } from '../../services/magasinier.service';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';
import { DocumentConfigService, DocumentDisplaySetting, DocumentType } from '../../../admin/services/document-config.service';

@Component({
    selector: 'app-bon-form',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
    templateUrl: './bon-form.component.html',
    styleUrl: './bon-form.component.css'
})
export class BonFormComponent implements OnInit {
    private logistiqueService = inject(LogistiqueService);
    private magasinierService = inject(MagasinierService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);
    private entrepriseService = inject(EntrepriseService);
    private keycloak = inject(KeycloakService);
    private docConfigService = inject(DocumentConfigService);

    docSetting: DocumentDisplaySetting | null = null;

    showReactivateConfirm = false;
    userRoles: string[] = [];

    entreprise: Entreprise | null = null;
    notification: { message: string, type: 'success' | 'error' } | null = null;
    isAutoNumeroBon = true;
    parametres: any = null;

    get currencySymbol(): string {
        return this.entrepriseService.getDeviseSymbol(this.entreprise);
    }

    bon: Bon = {
        numeroBon: '',
        date: '',
        typeBon: TypeBon.ENTREE
    };

    mouvement: MouvementStock = {
        date: '',
        montantHTVA: 0,
        montantTTC: 0,
        typeMouvement: TypeMouvement.ENTREE_RECEPTION,
        ligneMouvement: []
    };

    fournisseurs: Fournisseur[] = [];
    pieces: any[] = [];
    piecesRawData: any[] = [];

    activeTab: 'produits' | 'autres' = 'produits';
    isEditMode = false;
    isPrintView = false;
    loading = false;

    errors: { [key: string]: string } = {};
    formSubmitted = false;

    get isReadOnly(): boolean {
        return this.isAuditeur();
    }

    isAuditeur(): boolean {
        return this.userRoles.some(r =>
            r.toLowerCase() === 'auditeur' ||
            r.toLowerCase() === 'role_auditeur'
        );
    }

    openDropdownIndex: number | null = null;
    pieceSearchText: string = '';
    filteredPieces: any[] = [];

    showSupplierDropdown = false;
    supplierSearchText: string = '';
    filteredFournisseurs: Fournisseur[] = [];

    showBonSortieDropdown = false;
    bonSortieSearchText: string = '';
    allBonsSortie: Bon[] = [];
    allBons: Bon[] = [];
    filteredBonsSortie: Bon[] = [];

    TypeBon = TypeBon;
    TypeMouvement = TypeMouvement;

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.userRoles = this.keycloak.getUserRoles() || [];
            this.loadFournisseurs();
            this.loadPieces();
            this.loadSourceBons();
            this.loadEntreprise();
            this.loadParametres();
            this.loadDocSetting();

            const id = this.route.snapshot.paramMap.get('id');
            if (id && id !== 'nouveau') {
                this.isEditMode = true;
                this.loadBon(parseInt(id, 10));
            } else {
                this.bon = this.initNewBon();
                this.mouvement = this.initNewMouvement();
            }

            this.route.queryParams.subscribe(params => {
                if (params['print'] === '1' || this.isPrintView) {
                    this.isPrintView = true;
                    this.loadDocSetting();
                    setTimeout(() => {
                        window.print();
                    }, 1200);
                }
            });

            this.cdr.detectChanges();
        }
    }

    loadParametres() {
        this.magasinierService.getAllParametres().subscribe({
            next: (data) => {
                this.parametres = data || [];
                if (this.parametres.length > 0 && !this.isEditMode) {
                    const module = this.getModuleForType(this.bon.typeBon);
                    this.isAutoNumeroBon = this.isModuleAuto(module);
                    this.bon.numeroBon = this.isAutoNumeroBon ? 'AUTO' : '';
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

    getFormatExplanation(moduleName: string): string | null {
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
        return null;
    }

    getModuleForType(type: TypeBon): string {
        switch (type) {
            case TypeBon.ENTREE: return 'BON_ENTREE';
            case TypeBon.SORTIE: return 'BON_SORTIE';
            case TypeBon.RETOUR: return 'BON_RETOUR';
            default: return 'BON_ENTREE';
        }
    }

    print() {
        if (this.bon.id) {
            let docType = 'BON_ENTREE';
            if (this.bon.typeBon === 'SORTIE') docType = 'BON_SORTIE';
            if (this.bon.typeBon === 'RETOUR') docType = 'BON_RETOUR';
            this.router.navigate(['/document/preview', this.bon.id], { queryParams: { type: docType } });
        } else {
            alert('Veuillez sauvegarder le document avant de pouvoir l\'imprimer.');
        }
    }

    goBackToList() {
        if (this.isAuditeur()) {
            this.router.navigate(['/auditeur/bons']);
        } else {
            this.router.navigate(['/magasinier/bons']);
        }
    }

    get isReturnMode(): boolean {
        return this.bon.typeBon === TypeBon.RETOUR ||
            (this.bon.typeBon === TypeBon.ENTREE && this.mouvement.typeMouvement === TypeMouvement.ENTREE_RETOUR);
    }

    get isSupplierApplicable(): boolean {
        return this.bon.typeBon === TypeBon.ENTREE && this.mouvement.typeMouvement !== TypeMouvement.ENTREE_RETOUR;
    }

    initNewBon(): Bon {
        const now = new Date();
        return {
            numeroBon: 'AUTO',
            date: now.toISOString().substring(0, 10),
            typeBon: TypeBon.ENTREE
        };
    }

    initNewMouvement(): MouvementStock {
        return {
            date: new Date().toISOString(),
            montantHTVA: 0,
            montantTTC: 0,
            typeMouvement: TypeMouvement.ENTREE_RECEPTION,
            ligneMouvement: []
        };
    }

    onTypeBonChange() {
        if (!this.isSupplierApplicable) {
            this.bon.fournisseur = undefined;
            this.supplierSearchText = '';
        }

        if (this.bon.typeBon === TypeBon.SORTIE) {
            this.mouvement.typeMouvement = TypeMouvement.SORTIE_VENTE;
            this.updateLinesWithPrices();
        } else if (this.bon.typeBon === TypeBon.ENTREE) {
            this.mouvement.typeMouvement = TypeMouvement.ENTREE_RECEPTION;
            this.resetLinesPrices();
        } else if (this.bon.typeBon === TypeBon.RETOUR) {
            this.mouvement.typeMouvement = TypeMouvement.ENTREE_RETOUR;
        }

        if (!this.isEditMode) {
            const module = this.getModuleForType(this.bon.typeBon);
            this.isAutoNumeroBon = this.isModuleAuto(module);
            this.bon.numeroBon = this.isAutoNumeroBon ? 'AUTO' : '';
        }

        this.cdr.detectChanges();
    }

    private resetLinesPrices() {
        this.mouvement.ligneMouvement.forEach(line => {
            line.prixHTVA = 0;
        });
    }

    onTypeMouvementChange() {
        if (!this.isSupplierApplicable) {
            this.bon.fournisseur = undefined;
            this.supplierSearchText = '';
        }

        if (this.mouvement.typeMouvement === TypeMouvement.SORTIE_VENTE) {
            this.updateLinesWithPrices();
        } else {
            this.resetLinesPrices();
        }

        this.cdr.detectChanges();
    }

    private updateLinesWithPrices() {
        this.mouvement.ligneMouvement.forEach(line => {
            if (line.piece?.id) {
                const pieceId = line.piece.id;
                // Since we aggregate pieces, we match primarily by piece ID
                const pieceInfo = this.pieces.find(p => p.id === pieceId);

                if (pieceInfo) {
                    line.prixHTVA = pieceInfo.prixVente ?? 0;
                    line.tauxTVA = pieceInfo.tauxTVA ?? 19;
                }
            }
        });
    }

    loadSourceBons() {
        this.logistiqueService.getAllBons().subscribe((data: Bon[]) => {
            this.allBons = data;
            this.allBonsSortie = data.filter((b: Bon) => b.typeBon === TypeBon.SORTIE || b.typeBon === TypeBon.ENTREE);
            this.filterBonsSortie();
        });
    }

    filterBonsSortie() {
        let list = [...this.allBonsSortie];

        if (this.bon.typeBon === TypeBon.ENTREE && this.mouvement.typeMouvement === TypeMouvement.ENTREE_RETOUR) {
            list = list.filter(b => b.typeBon === TypeBon.SORTIE && b.mouvement?.typeMouvement === TypeMouvement.SORTIE_MAINTENANCE);
        }

        if (!this.bonSortieSearchText) {
            this.filteredBonsSortie = list.slice(0, 10);
        } else {
            const search = this.bonSortieSearchText.toLowerCase();
            this.filteredBonsSortie = list.filter(b =>
                b.numeroBon.toLowerCase().includes(search)
            ).slice(0, 10);
        }
    }

    toggleBonSortieDropdown(event: Event) {
        event.stopPropagation();
        this.showBonSortieDropdown = !this.showBonSortieDropdown;
        if (this.showBonSortieDropdown) {
            this.bonSortieSearchText = this.bon.bonOrigine ? this.bon.bonOrigine.numeroBon : '';
            this.filterBonsSortie();
        }
    }

    selectBonSortie(b: Bon) {
        this.bon.bonOrigine = b;
        this.showBonSortieDropdown = false;

        if (b.typeBon === TypeBon.SORTIE) {
            this.mouvement.typeMouvement = TypeMouvement.ENTREE_RETOUR;
            this.bon.fournisseur = undefined;
        } else if (b.typeBon === TypeBon.ENTREE) {
            this.mouvement.typeMouvement = TypeMouvement.SORTIE_RETOUR;
            this.bon.fournisseur = b.fournisseur;
        }


        if (b.mouvement && b.mouvement.ligneMouvement) {
            this.mouvement.ligneMouvement = b.mouvement.ligneMouvement.map(oldLigne => ({
                quantite: oldLigne.quantite,
                prixHTVA: oldLigne.prixHTVA,
                tauxTVA: oldLigne.tauxTVA,
                piece: oldLigne.piece,
                detailPiece: oldLigne.detailPiece
            }));
        } else {
            this.mouvement.ligneMouvement = [];
        }

        this.cdr.detectChanges();
    }

    getBonSortieDisplayValue(): string {
        return this.showBonSortieDropdown ? this.bonSortieSearchText : (this.bon.bonOrigine ? this.bon.bonOrigine.numeroBon : '');
    }



    loadFournisseurs() {
        this.logistiqueService.getAllFournisseurs().subscribe(data => {
            this.fournisseurs = data;
            this.cdr.detectChanges();
        });
    }

    loadPieces() {
        this.magasinierService.getPieces().subscribe(data => {
            this.piecesRawData = data;
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
                originalPiece: p,
                allDetails: p.details || []
            };
        });
    }

    loadEntreprise() {
        this.entrepriseService.getCurrentEntreprise().subscribe({
            next: (data) => {
                this.entreprise = data;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Erreur chargement entreprise:', err)
        });
    }

    loadBon(id: number) {
        this.loading = true;
        this.logistiqueService.getBonById(id).subscribe({
            next: (data) => {
                this.bon = data;
                this.isAutoNumeroBon = this.bon.numeroBon === 'AUTO';
                if (this.bon.date) this.bon.date = this.bon.date.substring(0, 10);


                if (this.bon.id) {

                    if ((data as any).mouvement) {
                        this.mouvement = (data as any).mouvement;
                    }
                }

                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                this.goBackToList();
            }
        });
    }

    loadDocSetting() {
        const docType = this.mapTypeBonToDocType(this.bon.typeBon);
        this.docConfigService.getSettingByType(docType).subscribe({
            next: (setting) => {
                this.docSetting = setting;
                // Rafraîchir les pièces avec le nouveau réglage
                if (this.pieces.length > 0) {
                    const raw = this.pieces.map(p => p.originalPiece || p);
                    this.pieces = this.explodePieces(raw);
                }
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Erreur chargement doc settings:', err)
        });
    }

    private mapTypeBonToDocType(type: TypeBon): DocumentType {
        switch (type) {
            case TypeBon.ENTREE: return DocumentType.BON_ENTREE;
            case TypeBon.SORTIE: return DocumentType.BON_SORTIE;
            case TypeBon.RETOUR: return DocumentType.BON_RETOUR;
            default: return DocumentType.BON_ENTREE;
        }
    }

    getFilteredVariantsForPiece(piece: any): string[] {
        if (!piece) return [];
        const details = piece.allDetails || piece.details || [];

        // Mode restrictif : on n'affiche que si c'est autorisé ET si la valeur n'est pas vide ou "-"
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

    getPieceDisplayValue(index: number, ligne: any): string {
        if (this.openDropdownIndex === index) return this.pieceSearchText;

        const root = this.getPieceRootName(ligne);
        if (root === '—') return '—';

        const variants = this.getFilteredVariantsForPiece(ligne.piece);
        return variants.length > 0 ? `${root} - ${variants.join(' ')}` : root;
    }

    toggleAutoNumeroBon(val: boolean): void {
        this.isAutoNumeroBon = val;
        if (val) {
            this.bon.numeroBon = 'AUTO';
        } else if (this.bon.numeroBon === 'AUTO') {
            this.bon.numeroBon = '';
        }
        this.cdr.detectChanges();
    }

    addLigne() {
        if (this.bon.typeBon === TypeBon.RETOUR) return;

        if (!this.mouvement.ligneMouvement) this.mouvement.ligneMouvement = [];
        this.mouvement.ligneMouvement.push({
            quantite: 1,
            prixHTVA: 0,
            tauxTVA: 19,
            piece: null,
            detailPiece: null
        });
        this.cdr.detectChanges();
    }

    removeLigne(index: number) {
        this.mouvement.ligneMouvement.splice(index, 1);
        this.cdr.detectChanges();
    }

    toggleDropdown(index: number, event: Event) {
        event.stopPropagation();
        if (this.openDropdownIndex === index) {
            this.closeDropdown();
        } else {
            this.openDropdownIndex = index;
            const piece = this.mouvement.ligneMouvement[index].piece;
            this.pieceSearchText = piece ? (piece.aggregatedDesignation || piece.designation) : '';
            this.filterPieces();
        }
    }

    filterPieces() {
        if (!this.pieceSearchText) {
            this.filteredPieces = this.pieces.slice(0, 10);
        } else {
            const search = this.pieceSearchText.toLowerCase();
            this.filteredPieces = this.pieces.filter(p =>
                p.aggregatedDesignation?.toLowerCase().includes(search) ||
                p.designation?.toLowerCase().includes(search) ||
                (p.reference && p.reference.toLowerCase().includes(search))
            ).slice(0, 10);
        }
    }

    selectPiece(index: number, piece: any) {
        const line = this.mouvement.ligneMouvement[index];
        const rootPiece = piece.originalPiece || piece;

        line.piece = {
            id: rootPiece.id,
            designation: rootPiece.designation, // CORE name only
            aggregatedDesignation: piece.aggregatedDesignation, // Kept for search input
            reference: rootPiece.reference,
            quantite: rootPiece.quantite,
            allDetails: piece.allDetails || rootPiece.details || []
        };
        line.detailPiece = null;
        line.tauxTVA = rootPiece.tauxTVA ?? 19;

        if (this.mouvement.typeMouvement === TypeMouvement.SORTIE_VENTE) {
            line.prixHTVA = rootPiece.prixVente ?? 0;
        } else {
            line.prixHTVA = 0;
        }

        this.closeDropdown();
        this.cdr.detectChanges();
    }

    closeDropdown() {
        this.openDropdownIndex = null;
        this.pieceSearchText = '';
        this.showSupplierDropdown = false;
        this.showBonSortieDropdown = false;
    }

    @HostListener('document:click')
    onDocumentClick() {
        this.closeDropdown();
    }

    onDropdownClick(event: MouseEvent) {
        event.stopPropagation();
    }

    toggleSupplierDropdown(event: Event) {
        event.stopPropagation();
        this.showSupplierDropdown = !this.showSupplierDropdown;
        if (this.showSupplierDropdown) {
            this.supplierSearchText = this.bon.fournisseur ? this.bon.fournisseur.nom : '';
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
        this.bon.fournisseur = f;
        this.showSupplierDropdown = false;
    }

    getSupplierDisplayValue(): string {
        return this.showSupplierDropdown ? this.supplierSearchText : (this.bon.fournisseur ? this.bon.fournisseur.nom : '');
    }

    getPieceRootName(ligne: any): string {
        if (!ligne || !ligne.piece) return '—';
        return ligne.piece.designation || '—';
    }

    getPieceVariantArray(ligne: any): string[] {
        if (!ligne || !ligne.piece) return [];
        return this.getVariantsForPiece(ligne.piece);
    }

    getVariantsForPiece(piece: any): string[] {
        return this.getFilteredVariantsForPiece(piece);
    }

    getPieceDesignation(ligne: any): string {
        const root = this.getPieceRootName(ligne);
        if (root === '—') return '—';

        const variantArray = this.getPieceVariantArray(ligne);
        return variantArray.length > 0 ? `${root} - ${variantArray.join(' ')}` : root;
    }





    get totalBrut(): number {
        return this.mouvement.ligneMouvement?.reduce((acc, ligne) => acc + (ligne.quantite * (ligne.prixHTVA || 0)), 0) || 0;
    }

    get totalTaxe(): number {
        return this.mouvement.ligneMouvement?.reduce((acc, ligne) => {
            return acc + (ligne.quantite * (ligne.prixHTVA || 0) * ((ligne.tauxTVA || 0) / 100));
        }, 0) || 0;
    }

    get totalTTC(): number {
        return this.totalBrut + this.totalTaxe;
    }

    getReturnViolation(): string | null {
        if (!this.bon.bonOrigine || !this.bon.bonOrigine.mouvement) return null;

        const originLines = this.bon.bonOrigine.mouvement.ligneMouvement || [];
        const otherReturns = this.allBons.filter(b =>
            b.bonOrigine?.id === this.bon.bonOrigine?.id &&
            b.id !== this.bon.id &&
            b.mouvement
        );

        for (const line of this.mouvement.ligneMouvement) {
            if (!line.piece?.id) continue;

            const pieceId = line.piece.id;
            const originalLine: any = (Array.isArray(originLines) ? originLines : Array.from(originLines)).find((l: any) => l.piece?.id === pieceId);
            const originalQty = originalLine ? originalLine.quantite : 0;

            if (originalQty === 0) continue;

            let alreadyReturnedQty = 0;
            for (const otherReturn of otherReturns) {
                const lines = otherReturn.mouvement?.ligneMouvement || [];
                const existingLine: any = (Array.isArray(lines) ? lines : Array.from(lines)).find((l: any) => l.stock?.piece?.id === pieceId);
                if (existingLine) {
                    alreadyReturnedQty += existingLine.quantite;
                }
            }

            if (alreadyReturnedQty + line.quantite > originalQty) {
                const remaining = originalQty - alreadyReturnedQty;
                return `La quantité de retour pour '${line.piece.designation}' dépasse la limite autorisée. Reste possible : ${remaining} (Déjà retourné : ${alreadyReturnedQty}/${originalQty}).`;
            }
        }
        return null;
    }

    validate(): boolean {
        this.errors = {};
        this.formSubmitted = true;

        if (this.isSupplierApplicable && !this.bon.fournisseur?.id) {
            this.errors['fournisseur'] = 'Le fournisseur est obligatoire pour un bon d\'entrée.';
        }

        if (this.bon.typeBon === TypeBon.RETOUR && !this.bon.bonOrigine?.id) {
            this.errors['numeroBonOrigine'] = 'Le numéro du bon d\'origine est obligatoire pour un retour.';
        }

        if (this.isReturnMode) {
            const violation = this.getReturnViolation();
            if (violation) {
                this.errors['global'] = violation;
            }
        }

        if (!this.bon.date) {
            this.errors['date'] = 'La date est obligatoire.';
        }

        if (this.mouvement.ligneMouvement.length === 0) {
            this.errors['lignes'] = 'Le bon doit contenir au moins une ligne.';
        } else {
            this.mouvement.ligneMouvement.forEach((l, i) => {
                if (!l.piece) {
                    this.errors[`ligne_${i}_piece`] = `Ligne ${i + 1}: Produit obligatoire`;
                } else {
                    if (this.bon.typeBon === TypeBon.SORTIE) {
                        const available = l.piece.quantite || 0;
                        if (l.quantite > available) {
                            this.errors[`ligne_${i}_qte`] = `Ligne ${i + 1}: Quantité insuffisante pour '${l.piece.designation}' (Requis: ${l.quantite}, Disponible: ${available})`;
                        }
                    }
                }

                if (l.quantite == null || l.quantite <= 0) {
                    this.errors[`ligne_${i}_qte`] = `Ligne ${i + 1}: Quantité doit être supérieure à 0`;
                }

                if (l.prixHTVA == null || l.prixHTVA <= 0) {
                    this.errors[`ligne_${i}_prix`] = `Ligne ${i + 1}: Le prix unitaire doit être supérieur à 0`;
                }

                if (l.tauxTVA == null || l.tauxTVA <= 0) {
                    this.errors[`ligne_${i}_tva`] = `Ligne ${i + 1}: Le taux TVA doit être supérieur à 0`;
                }
            });
        }

        if (Object.keys(this.errors).length > 0) {
            window.scrollTo({ top: 0, behavior: 'auto' });
        }

        return Object.keys(this.errors).length === 0;
    }

    save() {
        if (!this.validate()) return;

        this.loading = true;
        this.cdr.detectChanges();

        // 1. Format dates strictly
        let movementDate = this.mouvement.date;
        if (!movementDate) {
            movementDate = new Date().toISOString().substring(0, 19);
        } else if (movementDate.includes('T') && (movementDate.split(':').length === 2)) {
            movementDate = movementDate + ':00';
        }

        // 2. Build Extremely clean Movement Payload
        const lines: any[] = (this.mouvement.ligneMouvement || [])
            .filter(l => l.piece?.id)
            .map(l => {
                const line: any = {
                    quantite: Number(l.quantite || 0),
                    prixHTVA: Number(l.prixHTVA || 0),
                    tauxTVA: Number(l.tauxTVA || 19),
                    piece: { id: l.piece.id },
                    detailPiece: l.detailPiece ? { id: l.detailPiece.id } : null
                };

                if (l.id && l.id !== 0) line.id = l.id;

                return line;
            });

        const mouvementToSave: any = {
            date: movementDate,
            montantHTVA: Number(this.totalBrut || 0),
            montantTTC: Number(this.totalTTC || 0),
            typeMouvement: this.mouvement.typeMouvement,
            ligneMouvement: lines
        };
        if (this.mouvement.id) mouvementToSave.id = this.mouvement.id;

        // 3. Final Bon Payload
        const bonToSave: any = {
            id: this.isEditMode ? this.bon.id : undefined,
            numeroBon: (this.bon.numeroBon && this.bon.numeroBon !== '0') ? this.bon.numeroBon : undefined,
            date: this.bon.date,
            typeBon: this.bon.typeBon,
            fournisseur: (this.isSupplierApplicable && this.bon.fournisseur?.id) ? { id: this.bon.fournisseur.id } : null,
            bonOrigine: (this.isReturnMode && this.bon.bonOrigine?.id) ? { id: this.bon.bonOrigine.id } : null,
            mouvement: mouvementToSave
        };

        console.log('Sending Bon Payload:', JSON.stringify(bonToSave, null, 2));

        // 4. API Call
        const apiCall = this.isEditMode && this.bon.id
            ? this.logistiqueService.updateBon(this.bon.id, bonToSave)
            : this.logistiqueService.createBon(bonToSave);

        apiCall.subscribe({
            next: () => this.handleSuccess(),
            error: (err) => this.handleError(err)
        });
    }

    private handleSuccess() {
        this.loading = false;
        this.notify('Le bon a été enregistré avec succès !', 'success');
        setTimeout(() => {
            if (isPlatformBrowser(this.platformId)) {
                this.goBackToList();
            }
        }, 1500);
    }

    private buildBonPayload(): any {
        // This is a helper method used elsewhere if needed, but save() now handles it locally
        return {
            id: this.isEditMode ? this.bon.id : undefined,
            numeroBon: this.bon.numeroBon,
            date: this.bon.date,
            typeBon: this.bon.typeBon,
            fournisseur: (this.isSupplierApplicable && this.bon.fournisseur?.id) ? { id: this.bon.fournisseur.id } : null,
            bonOrigine: (this.isReturnMode && this.bon.bonOrigine?.id) ? { id: this.bon.bonOrigine.id } : null
        };
    }

    handleError(err: any) {
        this.loading = false;
        console.error('API Error:', err);
        const backendMessage = err.error?.detail || err.error?.message || (typeof err.error === 'string' ? err.error : null);
        this.errors['global'] = backendMessage || 'Une erreur est survenue lors de la communication avec le serveur.';

        this.cdr.detectChanges();
        if (isPlatformBrowser(this.platformId)) {
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
    }

    cancel() {
        this.goBackToList();
    }

    // ─── Méthodes manquantes référencées par le template ───────────────────────

    hasRole(role: string): boolean {
        const roles = this.keycloak.getUserRoles() || [];
        const normalize = (r: string) => r.toUpperCase().replace('ROLE_', '').replace(/\s+/g, '_');
        const target = normalize(role);
        return roles.some(r => normalize(r) === target);
    }

    reactivate(): void {
        this.showReactivateConfirm = true;
        this.cdr.detectChanges();
    }

    cancelReactivate(): void {
        this.showReactivateConfirm = false;
        this.cdr.detectChanges();
    }

    confirmReactivate(): void {
        if (!this.bon.id) return;
        this.loading = true;
        this.logistiqueService.reactivateBon(this.bon.id).subscribe({
            next: (updated) => {
                this.bon = updated;
                this.showReactivateConfirm = false;
                this.loading = false;
                this.notify('Bon réactivé avec succès !', 'success');
                setTimeout(() => this.goBackToList(), 1500);
            },
            error: () => {
                this.loading = false;
                this.showReactivateConfirm = false;
                this.notify('Erreur lors de la réactivation.', 'error');
            }
        });
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
