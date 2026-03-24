import { Component, OnInit, Input, Output, EventEmitter, inject, ChangeDetectorRef, OnChanges, SimpleChanges, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { PieceDetachee, Categorie, ProduitFini, Parametre, DetailPiece, Unite, TypeChamp } from '../../models/magasinier.models';
import { Devise } from '../../../admin/models/entreprise.model';
import { MagasinierService } from '../../services/magasinier.service';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { finalize, Subject, debounceTime, takeUntil } from 'rxjs';

@Component({
    selector: 'app-piece-form',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmDialogComponent],
    templateUrl: './piece-form.component.html',
    styleUrl: './piece-form.component.css'
})
export class PieceFormComponent implements OnInit, OnChanges, OnDestroy {
    @Input() showModal: boolean = false;
    @Input() selectedPiece: PieceDetachee | null = null;
    @Input() parametres: Parametre[] = [];
    @Input() categories: Categorie[] = [];
    @Input() produitsFinis: ProduitFini[] = [];
    @Input() unites: Unite[] = [];
    @Input() errorMessage: string | null = null;
    @Input() devise: Devise | null | undefined = null;
    @Output() close = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>(); // Added for consistency with PieceListComponent template
    @Output() save = new EventEmitter<{ piece: any, file: File | null }>();
    @Output() quickAddCategory = new EventEmitter<Categorie>();
    @Output() quickAddProduct = new EventEmitter<{ product: ProduitFini, file: File | null }>();

    @ViewChild('pieceForm') pieceForm?: NgForm;

    newPiece: PieceDetachee = this.initNewPiece();
    showUnsavedChangesDialog: boolean = false;
    imagePreview: string | null = null;
    selectedFile: File | null = null;
    localParametres: Parametre[] = [];
    staticParametres: Parametre[] = [];
    variantParametres: Parametre[] = [];

    // Search and Selection
    productSearchTerm: string = '';
    filteredProductsList: ProduitFini[] = [];
    showProductSelector: boolean = false;

    // Quick Add Categorie
    showQuickAddCategorie: boolean = false;
    newCategory: { nom: string, code: string, description: string } = { nom: '', code: 'AUTO', description: '' };

    // Quick Add Product
    showQuickAddProduct: boolean = false;
    newProduct: { designation: string, code: string, imageUrl: string } = { designation: '', code: 'AUTO', imageUrl: '' };
    newProductPreview: string | null = null;
    newProductFile: File | null = null;

    // Barcode & Duplicates
    barcodeDuplicates: Set<number> = new Set();
    backendBarcodeErrors: Set<string> = new Set();

    // Auto-complete toggles
    isAutoReference: boolean = true;
    isAutoCategoryCode: boolean = true;
    isAutoProductCode: boolean = true;

    // Variant Expansion state (Accordéon)
    expandedVariantIndex: number | null = null;
    targetPieceForSelection: PieceDetachee | null = null;

    // Search and Dropdown states
    categorySearchTerm: string = '';
    showCategoryDropdown: boolean = false;
    filteredCategories: Categorie[] = [];
    private categorySearchSubject = new Subject<string>();
    private destroy$ = new Subject<void>();

    private cdr = inject(ChangeDetectorRef);
    private magasinierService = inject(MagasinierService);
    private entrepriseService = inject(EntrepriseService);

    ngOnInit(): void {
        this.resetForm();

        this.categorySearchSubject.pipe(
            debounceTime(50),
            takeUntil(this.destroy$)
        ).subscribe(term => {
            this.executeCategorySearch(term);
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['showModal'] && changes['showModal'].currentValue === true &&
            changes['showModal'].previousValue !== true) {
            this.resetForm();
            this.cdr.markForCheck();
        } else if (changes['parametres'] && !changes['showModal']) {
            this.resetForm();
            this.cdr.markForCheck();
        } else {
            // Refresh lists if they change while modal is open
            if (changes['categories']) {
                this.executeCategorySearch(this.categorySearchTerm);
            }
            if (changes['parametres']) {
                this.localParametres = (this.parametres || []).map(p => ({
                    ...p,
                    options: p.options ? [...p.options] : [],
                    numerotationConfigs: p.numerotationConfigs ? p.numerotationConfigs.map(c => ({ ...c })) : []
                }));
                this.splitParametres();
            }
            if (changes['produitsFinis']) {
                this.filteredProductsList = [...this.produitsFinis];
            }
            if (changes['unites']) {
                this.cdr.markForCheck();
            }
        }
    }

    resetForm() {
        this.localParametres = (this.parametres || []).map(p => ({
            ...p,
            options: p.options ? [...p.options] : [],
            numerotationConfigs: p.numerotationConfigs ? p.numerotationConfigs.map(c => ({ ...c })) : []
        }));

        this.splitParametres();
        this.barcodeDuplicates.clear();
        this.backendBarcodeErrors.clear();
        this.expandedVariantIndex = null;

        if (this.selectedPiece) {
            this.newPiece = {
                ...this.selectedPiece,
                categorie: this.selectedPiece.categorie ? { ...this.selectedPiece.categorie } : undefined,
                unite: this.selectedPiece.unite ? { ...this.selectedPiece.unite } : undefined,
                details: this.selectedPiece.details ? [...this.selectedPiece.details] : [],
                variations: this.selectedPiece.variations ? this.selectedPiece.variations.map(v => ({
                    ...v,
                    details: v.details ? [...v.details] : [],
                    produitsAssocies: v.produitsAssocies ? [...v.produitsAssocies] : []
                })) : [],
                produitsAssocies: this.selectedPiece.produitsAssocies ? [...this.selectedPiece.produitsAssocies] : []
            };
            this.imagePreview = this.newPiece.imageUrl || null;
            this.initializeDynamicFields();
            this.categorySearchTerm = this.newPiece.categorie?.nom || '';
        } else {
            this.newPiece = this.initNewPiece();
            this.imagePreview = null;
            this.selectedFile = null;
            this.categorySearchTerm = '';
        }

        this.filteredProductsList = [...this.produitsFinis];
        this.filteredCategories = [...this.categories];

        this.generateVariations();
    }

    initNewPiece(): PieceDetachee {
        return {
            designation: '',
            reference: 'AUTO',
            codeBarre: '',
            prixVente: 0,
            tauxTVA: 20,
            seuilMinimum: 0,
            seuilMaximum: 100,
            description: '',
            imageUrl: '',
            unite: undefined,
            archivee: false,
            details: [],
            variations: [],
            produitsAssocies: []
        };
    }
    isFormValid(): boolean {
        // Basic requirement
        const basicOk = !!(this.newPiece.designation && this.newPiece.categorie && this.newPiece.unite);

        // Main Threshold integrity
        const sMin = Number(this.newPiece.seuilMinimum || 0);
        const sMax = Number(this.newPiece.seuilMaximum || 0);
        const thresholdsOk = sMin <= sMax;

        // Variations integrity
        const variationsOk = !this.newPiece.variations ||
            this.newPiece.variations.every(v => Number(v.seuilMinimum || 0) <= Number(v.seuilMaximum || 0));

        if (!thresholdsOk || !variationsOk) {
            console.warn('[Validation] Threshold Error:', { sMin, sMax, variationsOk });
        }

        return basicOk && thresholdsOk && variationsOk;
    }

    getThresholdError(): string | null {
        const sMin = Number(this.newPiece.seuilMinimum || 0);
        const sMax = Number(this.newPiece.seuilMaximum || 0);

        if (sMin > sMax) {
            return "Le seuil maximum doit être supérieur au seuil minimum (Modèle Principal).";
        }

        if (this.newPiece.variations) {
            const invalidVariant = this.newPiece.variations.find(v => Number(v.seuilMinimum || 0) > Number(v.seuilMaximum || 0));
            if (invalidVariant) {
                return `Le seuil maximum doit être supérieur au seuil minimum pour la version : ${invalidVariant.description || 'Spécifique'}.`;
            }
        }

        return null;
    }

    hasVariationError(v: PieceDetachee): boolean {
        return Number(v.seuilMinimum || 0) > Number(v.seuilMaximum || 0);
    }

    compareById(o1: any, o2: any): boolean {
        return o1 && o2 ? o1.id === o2.id : o1 === o2;
    }

    splitParametres(): void {
        this.staticParametres = this.localParametres.filter(p => !p.variante);
        this.variantParametres = this.localParametres.filter(p => p.variante);
    }

    isModuleAuto(moduleName: string): boolean {
        for (const p of (this.localParametres || [])) {
            const config = p.numerotationConfigs?.find(c => c.module?.toUpperCase() === moduleName.toUpperCase());
            if (config) return config.automatique !== false;
        }
        return true;
    }

    getPrefix(moduleName: string): string {
        for (const p of (this.localParametres || [])) {
            const config = p.numerotationConfigs?.find(c => c.module?.toUpperCase() === moduleName.toUpperCase());
            if (config) return config.prefix || '';
        }
        return '';
    }

    getCurrencyCode(): string {
        return this.devise?.code || this.devise?.symbole || 'TND';
    }

    getFormatExplanation(moduleName: string): string {
        const prefix = this.getPrefix(moduleName);
        if (prefix) return `Le code sera généré comme : ${prefix} + numéro séquentiel.`;
        return `Le code sera généré automatiquement par le système.`;
    }

    initializeDynamicFields() {
        console.log('--- INITIALIZING DYNAMIC FIELDS ---');
        console.log('Local Parametres count:', this.localParametres.length);
        console.log('New Piece Variations count:', this.newPiece.variations?.length || 0);

        if (!this.newPiece.details) this.newPiece.details = [];

        // Track which params are definitively variants
        const variantParamNames = new Set<string>();

        // 1. Any param that is globally `variante: true` is a variant
        this.localParametres.forEach(p => {
            if (p.variante) variantParamNames.add(p.nom);
        });

        // 2. Any param found in the details of the variations (siblings) is a variant
        if (this.newPiece.variations && this.newPiece.variations.length > 0) {
            this.newPiece.variations.forEach(variant => {
                variant.details?.forEach(d => {
                    const name = d.parametreNom || d.parametre?.nom;
                    if (name) variantParamNames.add(name);
                });
            });
        }

        // 3. Any param in main piece that was stored with parametre.variante=true in DB
        this.newPiece.details.forEach(d => {
            if (d.parametre?.variante) {
                const name = d.parametreNom || d.parametre?.nom;
                if (name) variantParamNames.add(name);
            }
        });

        // Collect all pieces to look through (Main piece + Variations)
        const allPieces = [this.newPiece];
        if (this.newPiece.variations && this.newPiece.variations.length > 0) {
            allPieces.push(...this.newPiece.variations);
        }

        allPieces.forEach(piece => {
            piece.details?.forEach(d => {
                const name = d.parametreNom || d.parametre?.nom;
                if (!name) return;

                let param = this.localParametres.find(p => p.id === d.parametre?.id || p.nom === name);
                const isVariant = variantParamNames.has(name);

                // If it's a static parameter, only process from the main piece
                if (!isVariant) {
                    if (piece === this.newPiece && param) {
                        const val = d.valeur ? String(d.valeur).trim() : '';
                        if (val && param.type === 'LISTE' && !param.options?.includes(val)) {
                            if (!param.options) param.options = [];
                            param.options.push(val);
                        }
                    }
                }
                // If it's a variant parameter
                else {
                    if (!param) {
                        console.log(`Attribute "${name}" is missing from settings. Reconstructing virtual param.`);
                        param = {
                            id: d.parametre?.id,
                            nom: name,
                            variante: true,
                            actif: true,
                            type: TypeChamp.LISTE,
                            options: [],
                            obligatoire: false,
                            ordre: 99,
                            numerotationConfigs: []
                        };
                        this.localParametres.push(param);
                    }

                    if (param) {
                        // FORCE attribute to be active and a variant
                        param.variante = true;
                        param.actif = true;

                        const val = d.valeur ? String(d.valeur).trim() : '';
                        if (val) {
                            if (!param.options) param.options = [];
                            if (!param.options.includes(val)) {
                                param.options.push(val);
                            }
                        }
                    }
                }
            });
        });

        // After reconstructing options, refresh the split parameters
        this.splitParametres();
    }

    addVariantOption(param: Parametre, input: HTMLInputElement): void {
        const val = input.value.trim();
        if (val) {
            if (!param.options) param.options = [];
            if (!param.options.includes(val)) {
                param.options.push(val);
                this.generateVariations();
                this.pieceForm?.form.markAsDirty();
            }
            input.value = '';
        }
    }

    removeVariantOption(param: Parametre, option: string): void {
        param.options = param.options?.filter(o => o !== option);
        this.generateVariations();
        this.pieceForm?.form.markAsDirty();
    }

    private isMatchingCombination(variant: PieceDetachee, combo: any[], variantParams: Parametre[]): boolean {
        if (!variant.details) return false;

        for (let i = 0; i < variantParams.length; i++) {
            const param = variantParams[i];
            const expectedVal = String(combo[i]).trim().toLowerCase();
            const detail = variant.details.find(d =>
                (d.parametre?.id === param.id) ||
                ((d.parametreNom || d.parametre?.nom)?.toLowerCase() === param.nom.toLowerCase())
            );

            if (!detail || String(detail.valeur).trim().toLowerCase() !== expectedVal) {
                return false;
            }
        }
        return true;
    }

    generateVariations(): void {
        const variantParams = this.localParametres.filter(p => p.variante && p.actif && p.options && p.options.length > 0);
        if (variantParams.length === 0) {
            this.newPiece.variations = [];
            return;
        }

        const combinations: any[][] = this.getCombinations(variantParams.map(p => p.options!));
        const existingVariations = this.newPiece.variations || [];
        let mainPieceMatched = false;

        const newVariations = combinations.map((combo) => {
            const variantValues = variantParams.map((p, i) => `${p.nom}: ${combo[i]}`).join(' | ');

            // 1. PRIORITIZE EXISTING VARIANTS (from database)
            // They have the specific barcodes and IDs we need
            const existing = existingVariations.find(v => this.isMatchingCombination(v, combo, variantParams));
            if (existing) return existing;

            // 2. FALLBACK TO ROOT PIECE
            // Only if it matches the combo and hasn't been used yet
            const isMatch = !mainPieceMatched && this.selectedPiece && this.isMatchingCombination(this.newPiece, combo, variantParams);
            if (isMatch) {
                mainPieceMatched = true;
                this.newPiece.details = variantParams.map((p, i) => {
                    const existingDetail = this.newPiece.details?.find(d => d.parametre?.id === p.id || (d.parametreNom || d.parametre?.nom)?.toLowerCase() === p.nom.toLowerCase());
                    return {
                        id: existingDetail ? existingDetail.id : undefined,
                        parametre: p,
                        parametreNom: p.nom,
                        valeur: combo[i]
                    };
                });
                return this.newPiece;
            }

            // 4. Fallback for brand NEW variant
            return {
                ...this.initNewPiece(),
                description: `Version ${variantValues}`,
                reference: 'AUTO',
                prixVente: this.newPiece.prixVente,
                tauxTVA: this.newPiece.tauxTVA,
                seuilMinimum: this.newPiece.seuilMinimum,
                seuilMaximum: this.newPiece.seuilMaximum,
                imageUrl: this.newPiece.imageUrl,
                details: variantParams.map((p, i) => ({
                    parametre: p,
                    parametreNom: p.nom,
                    valeur: combo[i]
                }))
            };
        });

        this.newPiece.variations = newVariations;
        this.checkDuplicateBarcodes();
        this.syncCommonProperties();
    }

    onMainPieceChange(): void {
        this.syncCommonProperties();
        this.cdr.detectChanges();
    }

    refreshUI(): void {
        this.cdr.detectChanges();
    }

    copyMainData(variant: PieceDetachee): void {
        if (!variant) return;

        // Recover barcode from main piece if variant's barcode is empty
        if (!variant.codeBarre && this.newPiece.codeBarre) {
            variant.codeBarre = this.newPiece.codeBarre;
        }

        variant.prixVente = this.newPiece.prixVente;
        variant.tauxTVA = this.newPiece.tauxTVA;
        variant.seuilMinimum = this.newPiece.seuilMinimum;
        variant.seuilMaximum = this.newPiece.seuilMaximum;
        variant.imageUrl = this.newPiece.imageUrl;
        variant.produitsAssocies = this.newPiece.produitsAssocies ? [...this.newPiece.produitsAssocies] : [];
        this.checkDuplicateBarcodes();
        this.cdr.detectChanges();
    }

    removeVariant(index: number): void {
        if (this.newPiece.variations) {
            this.newPiece.variations.splice(index, 1);
            this.checkDuplicateBarcodes();
            this.pieceForm?.form.markAsDirty();
            this.cdr.detectChanges();
        }
    }

    private getCombinations(arrays: any[][]): any[][] {
        return arrays.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())), [[]]);
    }

    getVariantLabel(variant: PieceDetachee): string {
        if (!variant.details) return 'Version Sans Nom';
        return variant.details
            .filter(d => d.parametre?.variante || this.localParametres.find(p => p.nom === (d.parametreNom || d.parametre?.nom))?.variante)
            .map(d => `${d.parametreNom || d.parametre?.nom}: ${d.valeur}`)
            .join(' | ') || 'Version Standard';
    }

    generateBarcode(piece: PieceDetachee): void {
        const timestamp = Date.now().toString().slice(-10);
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        piece.codeBarre = timestamp + random;
        this.checkDuplicateBarcodes();
        this.cdr.detectChanges();
    }

    checkDuplicateBarcodes(): void {
        this.barcodeDuplicates.clear();
        const seen = new Map<string, number>();

        this.newPiece.variations?.forEach((v, index) => {
            const bc = v.codeBarre?.trim().toLowerCase();
            if (bc) {
                if (seen.has(bc)) {
                    const firstIndex = seen.get(bc)!;
                    this.barcodeDuplicates.add(firstIndex);
                    this.barcodeDuplicates.add(index);
                } else {
                    seen.set(bc, index);
                }
            }
        });
    }

    hasVisibleFields(isVariant: boolean): boolean {
        return this.localParametres.some(p => p.actif && p.variante === isVariant);
    }

    onSubmit(): void {
        console.log('--- STARTING ONSUBMIT ---');
        try {
            // Validation: Seuil Min <= Seuil Max
            if (Number(this.newPiece.seuilMinimum || 0) > Number(this.newPiece.seuilMaximum || 0)) {
                this.errorMessage = "Le seuil maximum doit être supérieur au seuil minimum (Modèle Principal).";
                this.scrollToTop();
                return;
            }

            // Also check variations
            if (this.newPiece.variations) {
                const invalidVariant = this.newPiece.variations.find(v => Number(v.seuilMinimum || 0) > Number(v.seuilMaximum || 0));
                if (invalidVariant) {
                    this.errorMessage = `Le seuil maximum doit être supérieur au seuil minimum pour la version : ${invalidVariant.description || 'Spécifique'}.`;
                    this.scrollToTop();
                    return;
                }
            }

            if (!this.isFormValid()) {
                this.errorMessage = "Certains champs obligatoires sont manquants (Désignation, Catégorie ou Unité).";
                this.scrollToTop();
                return;
            }

            this.errorMessage = '';
            this.syncCommonProperties();

            // Final check: if we have variations, the barcode belongs to the versions, not the root.
            console.log('Sync complete, prepare final mapping...');

            let pieceFinal = { ...this.newPiece };
            const pieceToSave = this.mapPieceForSave(pieceFinal);
            if (pieceFinal.variations && pieceFinal.variations.length > 0) {
                pieceToSave.variations = pieceFinal.variations.map(v => this.mapPieceForSave(v));
            }
            console.log('PIECE TO SAVE:', pieceToSave);

            this.save.emit({ piece: pieceToSave, file: this.selectedFile });
            console.log('Save Event Emitted successfully');
        } catch (err) {
            console.error('CRITICAL ERROR in onSubmit:', err);
            this.errorMessage = "Une erreur est survenue lors de la préparation de l'envoi. Veuillez vérifier la console.";
            this.scrollToTop();
        }
    }

    private scrollToTop(): void {
        const body = document.querySelector('.form-body');
        if (body) {
            body.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    syncCommonProperties(): void {
        if (!this.newPiece.variations || this.newPiece.variations.length === 0) return;

        this.newPiece.variations.forEach((v, index) => {
            // ALWAYS Sync base info (designation, cat, unit) for all variants
            v.designation = this.newPiece.designation;
            v.categorie = this.newPiece.categorie;
            v.unite = this.newPiece.unite;

            // We no longer sync barcodes between variants because each variant has a SPECIFIC code.
            // If the variant's barcode is empty AND it matches the root piece, we might pull from root, 
            // but we stop propagating to all lines.

            if (index === 0) {
                v.tauxTVA = this.newPiece.tauxTVA;
                v.seuilMinimum = this.newPiece.seuilMinimum;
                v.seuilMaximum = this.newPiece.seuilMaximum;
                if (!v.produitsAssocies || v.produitsAssocies.length === 0) {
                    v.produitsAssocies = (this.newPiece.produitsAssocies && this.newPiece.produitsAssocies.length > 0)
                        ? [...this.newPiece.produitsAssocies] : [];
                }
            }
        });
        this.checkDuplicateBarcodes();
    }

    private mapPieceForSave(piece: PieceDetachee): any {
        const mapped: any = {
            id: piece.id,
            designation: piece.designation,
            reference: piece.reference,
            codeBarre: piece.codeBarre,
            prixVente: Number(piece.prixVente || 0),
            tauxTVA: Number(piece.tauxTVA || 0),
            seuilMinimum: Number(piece.seuilMinimum || 0),
            seuilMaximum: Number(piece.seuilMaximum || 0),
            description: piece.description,
            imageUrl: piece.imageUrl,
            unite: piece.unite,
            archivee: piece.archivee ?? false,
            details: (piece.details || []).map(d => ({
                id: d.id,
                parametreNom: d.parametreNom,
                valeur: d.valeur,
                parametre: d.parametre ? { id: d.parametre.id } : null
            }))
        };

        if (piece.categorie) mapped.categorie = { id: piece.categorie.id };

        mapped.produitsAssocies = (piece.produitsAssocies || []).map(p => ({
            id: p.id,
            designation: p.designation,
            code: p.code
        }));

        return mapped;
    }

    closeModal() {
        if (this.isFormDirty()) {
            this.showUnsavedChangesDialog = true;
            this.cdr.detectChanges();
        } else {
            this.forceClose();
        }
    }

    private isFormDirty(): boolean {
        // If it's a new piece and nothing has been typed, it's not dirty
        if (!this.selectedPiece && !this.pieceForm?.dirty && !this.selectedFile) {
            return false;
        }
        return this.pieceForm?.dirty || !!this.selectedFile;
    }

    onConfirmStay() {
        this.showUnsavedChangesDialog = false;
        this.cdr.detectChanges();
    }

    handleSaveFromDialog() {
        this.showUnsavedChangesDialog = false;
        this.onSubmit();
        this.cdr.detectChanges();
    }

    onConfirmQuit() {
        this.showUnsavedChangesDialog = false;
        this.forceClose();
        this.cdr.detectChanges();
    }

    private forceClose() {
        this.close.emit();
        this.cancel.emit();
        this.cdr.detectChanges();
    }

    getImageUrl(path: string | null | undefined): string {
        if (!path) return 'assets/img/default-piece.png';
        if (path.startsWith('data:')) return path;
        return this.entrepriseService.getImageUrl(path);
    }

    onFileSelected(event: Event, piece?: PieceDetachee): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                if (piece) {
                    piece.imageUrl = reader.result as string;
                } else {
                    this.selectedFile = file;
                    this.imagePreview = reader.result as string;
                }
                this.cdr.detectChanges();
            };
            reader.readAsDataURL(file);
        }
    }

    removeImage(event: MouseEvent, piece?: PieceDetachee): void {
        event.preventDefault();
        event.stopPropagation();
        if (piece) {
            piece.imageUrl = '';
        } else {
            this.selectedFile = null;
            this.imagePreview = null;
            this.newPiece.imageUrl = '';
            if (this.selectedPiece) this.selectedPiece.imageUrl = '';
        }
        this.cdr.detectChanges();
    }

    toggleCategorieModal(event?: Event): void {
        if (event) event.stopPropagation();
        this.showQuickAddCategorie = !this.showQuickAddCategorie;
        if (this.showQuickAddCategorie) {
            this.showCategoryDropdown = false;
            // pre-fill nom from search term if any
            this.newCategory = { nom: this.categorySearchTerm, code: 'AUTO', description: '' };
        } else {
            this.newCategory = { nom: '', code: 'AUTO', description: '' };
        }
        this.cdr.detectChanges();
    }

    onCategorySearch(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.categorySearchTerm = value;
        this.showCategoryDropdown = true;
        this.categorySearchSubject.next(value);
    }

    private executeCategorySearch(term: string): void {
        const normalizedTerm = term.toLowerCase().trim();
        this.filteredCategories = normalizedTerm
            ? this.categories.filter(c => c.nom.toLowerCase().includes(normalizedTerm))
            : [...this.categories];
        this.cdr.detectChanges();
    }

    openCategoryDropdown(): void {
        this.filteredCategories = this.categorySearchTerm
            ? this.categories.filter(c => c.nom.toLowerCase().includes(this.categorySearchTerm.toLowerCase()))
            : [...this.categories];
        this.showCategoryDropdown = true;
    }

    selectCategory(cat: Categorie): void {
        this.newPiece.categorie = cat;
        this.categorySearchTerm = cat.nom;
        this.showCategoryDropdown = false;
        this.pieceForm?.form.markAsDirty();
        this.cdr.detectChanges();
    }

    toggleCategoryDropdown(): void {
        this.showCategoryDropdown = !this.showCategoryDropdown;
        if (this.showCategoryDropdown) {
            this.filteredCategories = [...this.categories];
        }
    }

    @HostListener('document:click', ['$event'])
    onClickOutside(event: MouseEvent) {
        if (!this.showCategoryDropdown) return;
        const target = event.target as HTMLElement;
        if (!target.closest('.p-dropdown')) {
            this.showCategoryDropdown = false;
            this.cdr.detectChanges();
        }
    }

    submitQuickAddCategorie(): void {
        if (!this.newCategory.nom) return;
        this.quickAddCategory.emit({
            nom: this.newCategory.nom,
            code: this.newCategory.code,
            description: this.newCategory.description,
            archivee: false
        });
        // pre-select the just-added category's name in the search field
        this.categorySearchTerm = this.newCategory.nom;
        this.newCategory = { nom: '', code: 'AUTO', description: '' };
        this.showQuickAddCategorie = false;
    }

    toggleProductSelectorModal(event?: Event, piece?: PieceDetachee): void {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.targetPieceForSelection = piece || null;
        this.showProductSelector = !this.showProductSelector;
        this.cdr.detectChanges();
    }

    toggleProductSelection(product: ProduitFini, piece?: PieceDetachee): void {
        const targetPiece = piece || this.targetPieceForSelection || this.newPiece;
        if (!targetPiece.produitsAssocies) targetPiece.produitsAssocies = [];
        const index = targetPiece.produitsAssocies.findIndex(p => p.id === product.id);
        if (index === -1) {
            targetPiece.produitsAssocies.push({ ...product });
        } else {
            targetPiece.produitsAssocies.splice(index, 1);
        }
        this.pieceForm?.form.markAsDirty();
        this.cdr.detectChanges();
    }

    isProductSelected(productId?: number, piece?: PieceDetachee): boolean {
        const targetPiece = piece || this.targetPieceForSelection || this.newPiece;
        if (!productId || !targetPiece.produitsAssocies) return false;
        return targetPiece.produitsAssocies.some(p => p.id === productId);
    }

    removeAssociatedProduct(index: number, piece?: PieceDetachee): void {
        const targetPiece = piece || this.newPiece;
        if (targetPiece.produitsAssocies) {
            targetPiece.produitsAssocies.splice(index, 1);
            this.pieceForm?.form.markAsDirty();
            this.cdr.detectChanges();
        }
    }

    onProductSearchChange() {
        const term = this.productSearchTerm.toLowerCase();
        this.filteredProductsList = this.produitsFinis.filter(p =>
            p.designation.toLowerCase().includes(term) ||
            p.code.toLowerCase().includes(term)
        );
    }

    getSelectedProductsCount(piece?: PieceDetachee): number {
        const targetPiece = piece || this.targetPieceForSelection || this.newPiece;
        return targetPiece.produitsAssocies?.length ?? 0;
    }

    openQuickAddProduct(event?: Event): void {
        if (event) event.stopPropagation();
        this.showQuickAddProduct = true;
    }

    closeQuickAddProduct(): void {
        this.showQuickAddProduct = false;
        this.newProduct = { designation: '', code: 'AUTO', imageUrl: '' };
        this.newProductPreview = null;
        this.newProductFile = null;
    }

    onQuickProductFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            this.newProductFile = input.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                this.newProductPreview = reader.result as string;
                this.cdr.detectChanges();
            };
            reader.readAsDataURL(this.newProductFile);
        }
    }

    submitQuickAddProduct(): void {
        if (!this.newProduct.designation) return;
        const product: ProduitFini = {
            designation: this.newProduct.designation,
            code: this.newProduct.code
        };
        this.quickAddProduct.emit({ product, file: this.newProductFile });
        this.closeQuickAddProduct();
    }

    // Accordéon logic
    toggleVariantExpansion(index: number): void {
        this.expandedVariantIndex = this.expandedVariantIndex === index ? null : index;
        this.cdr.detectChanges();
    }

    isVariantCustomized(variant: PieceDetachee): boolean {
        const hasDiffSeuil = variant.seuilMinimum !== this.newPiece.seuilMinimum || variant.seuilMaximum !== this.newPiece.seuilMaximum;
        const hasDiffProd = (variant.produitsAssocies?.length || 0) !== (this.newPiece.produitsAssocies?.length || 0);
        const hasDiffImg = variant.imageUrl && variant.imageUrl !== this.newPiece.imageUrl;
        return !!(hasDiffSeuil || hasDiffImg || hasDiffProd);
    }

    private handleBackendError(error: string): void {
        const match = error.match(/Le code barre '(.+?)'/);
        if (match && match[1]) {
            this.backendBarcodeErrors.add(match[1].trim());
        }
    }

    champToRemoveFrom: Parametre | null = null;
    optionToRemove: string | null = null;
    showConfirmModal = false;

    confirmRemoveOption(champ: Parametre, option: string, event: Event): void {
        event.stopPropagation();
        this.champToRemoveFrom = champ;
        this.optionToRemove = option;
        this.showConfirmModal = true;
        this.cdr.detectChanges();
    }

    onConfirmDelete(): void {
        if (this.champToRemoveFrom && this.optionToRemove) {
            this.removeVariantOption(this.champToRemoveFrom, this.optionToRemove);
        }
        this.cancelDelete();
    }

    cancelDelete(): void {
        this.showConfirmModal = false;
        this.champToRemoveFrom = null;
        this.optionToRemove = null;
        this.cdr.detectChanges();
    }
}
