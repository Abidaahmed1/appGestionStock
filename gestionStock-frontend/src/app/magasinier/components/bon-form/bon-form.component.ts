import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LogistiqueService } from '../../../logistique/services/logistique.service';
import { Bon, TypeBon, Fournisseur, MouvementStock, TypeMouvement, LigneMouvement, Stock } from '../../../logistique/models/logistique.models';
import { MagasinierService } from '../../services/magasinier.service';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';

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

    entreprise: Entreprise | null = null;
    notification: { message: string, type: 'success' | 'error' } | null = null;

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
    stocks: Stock[] = [];
    pieces: any[] = [];

    activeTab: 'produits' | 'autres' = 'produits';
    isEditMode = false;
    isPrintView = false;
    loading = false;

    errors: { [key: string]: string } = {};
    formSubmitted = false;

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
            this.loadFournisseurs();
            this.loadPieces();
            this.loadStocks();
            this.loadSourceBons();
            this.loadEntreprise();

            const id = this.route.snapshot.paramMap.get('id');
            if (id && id !== 'nouveau') {
                this.isEditMode = true;
                this.loadBon(parseInt(id, 10));
            } else {
                this.bon = this.initNewBon();
                this.mouvement = this.initNewMouvement();
            }

            this.route.queryParams.subscribe(params => {
                if (params['print'] === '1') {
                    this.isPrintView = true;
                    setTimeout(() => {
                        window.print();
                    }, 1000);
                }
            });

            this.cdr.detectChanges();
        }
    }

    print() {
        if (this.bon.id) {
            this.router.navigate(['/magasinier/bons', this.bon.id], { queryParams: { print: '1' } });
        } else {
            window.print();
        }
    }

    goBackToList() {
        this.router.navigate(['/magasinier/bons']);
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
            numeroBon: '',
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
        } else if (this.bon.typeBon === TypeBon.ENTREE) {
            this.mouvement.typeMouvement = TypeMouvement.ENTREE_RECEPTION;
        } else if (this.bon.typeBon === TypeBon.RETOUR) {
            this.mouvement.typeMouvement = TypeMouvement.ENTREE_RETOUR;
        }
        this.cdr.detectChanges();
    }

    onTypeMouvementChange() {
        if (!this.isSupplierApplicable) {
            this.bon.fournisseur = undefined;
            this.supplierSearchText = '';
        }
        this.cdr.detectChanges();
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
                stock: oldLigne.stock
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
                        stock: detail.stock,
                        originalPiece: p,
                        variantDetail: detail
                    });
                });
            } else {
                exploded.push(p);
            }
        });
        return exploded;
    }

    loadStocks() {
        this.logistiqueService.getAllStocks().subscribe(data => {
            this.stocks = data;
            this.cdr.detectChanges();
        });
    }

    loadEntreprise() {
        this.entrepriseService.getAllEntreprises().subscribe(data => {
            if (data && data.length > 0) {
                this.entreprise = data[0];
                this.cdr.detectChanges();
            }
        });
    }

    loadBon(id: number) {
        this.loading = true;
        this.logistiqueService.getBonById(id).subscribe({
            next: (data) => {
                this.bon = data;
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
                this.router.navigate(['/magasinier/bons']);
            }
        });
    }

    addLigne() {
        if (this.bon.typeBon === TypeBon.RETOUR) return;

        if (!this.mouvement.ligneMouvement) this.mouvement.ligneMouvement = [];
        this.mouvement.ligneMouvement.push({
            quantite: 1,
            prixHTVA: 0,
            tauxTVA: 19,
            stock: { piece: null, quantite: 0, type: null } as any
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
            const piece = this.mouvement.ligneMouvement[index].stock?.piece;
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
        const line = this.mouvement.ligneMouvement[index];

        let stock = piece.stock;

        if (!stock) {
            stock = this.stocks.find(s => s.piece?.id === piece.id && !s.detailPiece);
        }

        if (!stock) {
            stock = { piece: piece, quantite: 0, type: 'DISPONIBLE' } as any;
        }

        line.stock = stock!;
        line.tauxTVA = piece.tauxTVA ?? 19;

        if (this.bon.typeBon === TypeBon.SORTIE) {
            line.prixHTVA = piece.prixVente ?? 0;
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

    getStockDesignation(stock: any): string {
        if (!stock || !stock.piece) return '—';
        if (stock.detailPiece) {
            const attributes = stock.detailPiece.attributs || {};
            const variantLabel = Object.entries(attributes)
                .filter(([key, value]) => !key.startsWith('_') && value !== null && value !== '' && String(value).trim() !== '')
                .map(([_, value]) => value)
                .join(' - ');
            return `${stock.piece.designation} [${variantLabel}]`;
        }
        return stock.piece.designation;
    }

    getPieceDisplayValue(index: number, ligne: any): string {
        if (this.openDropdownIndex === index) return this.pieceSearchText;
        return this.getStockDesignation(ligne.stock);
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
            if (!line.stock?.piece?.id) continue;

            const pieceId = line.stock.piece.id;
            const originalLine: any = (Array.isArray(originLines) ? originLines : Array.from(originLines)).find((l: any) => l.stock?.piece?.id === pieceId);
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
                return `La quantité de retour pour '${line.stock.piece.designation}' dépasse la limite autorisée. Reste possible : ${remaining} (Déjà retourné : ${alreadyReturnedQty}/${originalQty}).`;
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
                if (!l.stock?.piece) this.errors[`ligne_${i}_piece`] = `Ligne ${i + 1}: Produit obligatoire`;
                if (l.quantite <= 0) this.errors[`ligne_${i}_qte`] = `Ligne ${i + 1}: Quantité doit être > 0`;
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

        this.mouvement.montantHTVA = this.totalBrut;
        this.mouvement.montantTTC = this.totalTTC;

        if (this.bon.date) {
            this.mouvement.date = this.bon.date + 'T00:00:00';
        } else {
            this.mouvement.date = new Date().toISOString().slice(0, 19);
        }


        if (!this.mouvement.typeMouvement) {
            if (this.bon.typeBon === TypeBon.ENTREE) this.mouvement.typeMouvement = TypeMouvement.ENTREE_RECEPTION;
            else if (this.bon.typeBon === TypeBon.SORTIE) this.mouvement.typeMouvement = TypeMouvement.SORTIE_VENTE;
            else if (this.bon.typeBon === TypeBon.RETOUR) this.mouvement.typeMouvement = TypeMouvement.ENTREE_RETOUR;
        }

        const bonToSave = this.buildBonPayload();

        if (this.isEditMode && this.bon.id) {
            this.logistiqueService.updateBon(this.bon.id, bonToSave).subscribe({
                next: (savedBon) => { this.saveMouvement(savedBon.id!); },
                error: (err) => this.handleError(err)
            });
        } else {
            this.logistiqueService.createBon(bonToSave).subscribe({
                next: (savedBon) => { this.saveMouvement(savedBon.id!, true); },
                error: (err) => this.handleError(err)
            });
        }
    }

    private buildBonPayload(): any {
        return {
            id: this.isEditMode ? this.bon.id : undefined,
            numeroBon: this.bon.numeroBon,
            date: this.bon.date,
            typeBon: this.bon.typeBon,
            fournisseur: this.isSupplierApplicable && this.bon.fournisseur?.id ? { id: this.bon.fournisseur.id } : null,
            bonOrigine: this.bon.bonOrigine?.id ? { id: this.bon.bonOrigine.id } : null
        };
    }


    saveMouvement(bonId: number, isNewBon: boolean = false) {
        const payload: any = {
            id: this.mouvement.id,
            date: this.mouvement.date,
            montantHTVA: this.mouvement.montantHTVA,
            montantTTC: this.mouvement.montantTTC,
            typeMouvement: this.mouvement.typeMouvement,
            bon: {
                id: bonId,
                bonOrigine: this.bon.bonOrigine ? { id: this.bon.bonOrigine.id } : null
            },
            ligneMouvement: (this.mouvement.ligneMouvement || [])
                .filter(l => l.stock?.piece?.id)
                .map(l => ({
                    id: l.id ?? null,
                    quantite: l.quantite,
                    prixHTVA: l.prixHTVA ?? 0,
                    tauxTVA: l.tauxTVA ?? 19,
                    stock: {
                        id: l.stock.id ?? null,
                        piece: {
                            id: l.stock.piece!.id,
                            codeBarre: l.stock.piece!.codeBarre
                        }
                    }
                }))
        };

        const onSuccess = () => {
            this.loading = false;
            this.notify('Bon enregistré avec succès !', 'success');
            setTimeout(() => {
                this.router.navigate(['/magasinier/bons']);
            }, 1500);
        };

        const onError = (err: any) => {
            if (isNewBon) {
                console.warn('Movement failed, cleaning up orphan Bon ID:', bonId);
                this.logistiqueService.deleteBon(bonId).subscribe({
                    next: () => console.log('Cleanup successful'),
                    error: (deleteErr) => console.error('Cleanup failed:', deleteErr)
                });
            }
            this.handleError(err);
        };

        if (this.mouvement.id) {
            this.logistiqueService.updateMouvement(this.mouvement.id, payload).subscribe({
                next: onSuccess,
                error: onError
            });
        } else {
            this.logistiqueService.createMouvement(payload).subscribe({
                next: onSuccess,
                error: onError
            });
        }
    }

    handleError(err: any) {
        this.loading = false;
        console.error('API Error:', err);
        const backendMessage = err.error?.message || (typeof err.error === 'string' ? err.error : null);
        this.errors['global'] = backendMessage || 'Une erreur est survenue lors de la communication avec le serveur.';

        this.cdr.detectChanges();
        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    cancel() {
        this.router.navigate(['/magasinier/bons']);
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
