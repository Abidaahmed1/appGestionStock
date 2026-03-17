import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PieceDetachee, Categorie, ProduitFini, Parametre, ChampPersonnalise, Unite, NumerotationConfig } from '../../models/magasinier.models';
import { MagasinierService } from '../../services/magasinier.service';
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';

@Component({
    selector: 'app-piece-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './piece-form.component.html',
    styleUrl: './piece-form.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PieceFormComponent implements OnInit, OnChanges {
    @Input() selectedPiece: PieceDetachee | null = null;
    @Input() categories: Categorie[] = [];
    @Input() produitsFinis: ProduitFini[] = [];
    @Input() parametres: Parametre | null = null;
    @Input() unites: Unite[] = [];
    @Input() showModal: boolean = false;

    @Output() save = new EventEmitter<{ piece: PieceDetachee, file: File | null }>();
    @Output() cancel = new EventEmitter<void>();
    @Output() quickAddCategory = new EventEmitter<Categorie>();
    @Output() quickAddProduct = new EventEmitter<{ product: ProduitFini, file: File | null }>();

    newPiece: PieceDetachee = this.initNewPiece();
    imagePreview: string | null = null;
    selectedFile: File | null = null;

    categorySearchTerm = '';
    productSearchTerm = '';
    showCategorySelector = false;
    showProductSelector = false;

    // Cached filtered lists to avoid lag in templates
    filteredCategoriesList: Categorie[] = [];
    filteredProductsList: ProduitFini[] = [];

    showQuickAddCategory = false;
    showQuickAddProduct = false;
    newCategory: Categorie = { nom: '', code: 'AUTO', description: '' };
    newProduct: ProduitFini = { code: 'AUTO', designation: '' };
    quickProductFile: File | null = null;
    newProductPreview: string | null = null;
    showConfirmModal = false;
    optionToRemove: string = '';
    champToRemoveFrom: any = null;
    confirmEvent: MouseEvent | null = null;
    variantErrors: { [key: string]: boolean } = {};
    isAutoReference: boolean = true;
    isAutoCategoryCode: boolean = true;
    isAutoProductCode: boolean = true;

    private cdr = inject(ChangeDetectorRef);
    private magasinierService = inject(MagasinierService);
    private entrepriseService = inject(EntrepriseService);
    entreprise: Entreprise | null = null;
    barcodeDuplicates: Set<number> = new Set();
    @Input() set errorMessage(value: string | null) {
        if (value) {
            this.handleBackendError(value);
        }
    }
    backendBarcodeErrors: Set<string> = new Set();


    ngOnInit() {
        this.resetForm();
        this.loadEntreprise();
        this.updateFilteredCategoriesList();
        this.updateFilteredProductsList();
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

    ngOnChanges(changes: SimpleChanges) {
        if (changes['showModal'] && changes['showModal'].currentValue === true &&
            changes['showModal'].previousValue !== true) {
            this.resetForm();
            this.cdr.markForCheck();
        } else if (changes['parametres'] && !changes['showModal']) {
            this.resetForm();
            this.cdr.markForCheck();
        }
    }

    resetForm() {
        this.barcodeDuplicates.clear();
        this.backendBarcodeErrors.clear();
        if (this.selectedPiece) {
            const pieceToUse = (this.selectedPiece as any).originalPiece || this.selectedPiece;

            const normalizedDetails = (pieceToUse.details || []).map((d: any) => {
                const newD = { ...d };
                if (!newD.attributs) newD.attributs = {};
                if (this.parametres?.champsPersonnalises) {
                    this.parametres.champsPersonnalises.forEach(champ => {
                        if (newD[champ.nom] !== undefined) {
                            if (newD.attributs[champ.nom] === undefined) {
                                newD.attributs[champ.nom] = newD[champ.nom];
                            }
                            delete newD[champ.nom];
                        }
                    });
                }
                return newD;
            });

            this.newPiece = {
                ...pieceToUse,
                categorie: pieceToUse.categorie ? { ...pieceToUse.categorie } : { nom: '' },
                details: normalizedDetails.length > 0 ? normalizedDetails : [{ attributs: {} }]
            };
            this.imagePreview = pieceToUse.imageUrl || null;
        } else {
            this.newPiece = this.initNewPiece();
            this.imagePreview = null;
        }
        this.selectedFile = null;
        this.initializeDynamicFields();

        if (!this.selectedPiece) {
            this.isAutoReference = this.isModuleAuto('PIECE');
            this.newPiece.reference = this.isAutoReference ? 'AUTO' : '';
            this.isAutoCategoryCode = this.isModuleAuto('CATEGORIE');
            this.isAutoProductCode = this.isModuleAuto('PRODUIT');
            this.generateVariations();
        } else {
            this.isAutoReference = this.newPiece.reference === 'AUTO';
            this.isAutoCategoryCode = this.isModuleAuto('CATEGORIE');
            this.isAutoProductCode = this.isModuleAuto('PRODUIT');
        }
        this.syncComplementaryAttributes();
        this.updateFilteredCategoriesList();
        this.updateFilteredProductsList();
    }

    isModuleAuto(moduleName: string): boolean {
        const configs = this.parametres?.numerotationConfigs;
        if (!configs || !Array.isArray(configs)) return true;
        const config = configs.find((c: NumerotationConfig) => c.module === moduleName);
        return config ? config.automatique !== false : true;
    }

    getPrefix(moduleName: string): string {
        const config = this.parametres?.numerotationConfigs?.find((c: NumerotationConfig) => c.module === moduleName);
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
        const config = this.parametres?.numerotationConfigs?.find((c: NumerotationConfig) => c.module === moduleName);
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

    initNewPiece(): PieceDetachee {
        return {
            designation: '',
            prixVente: 0,
            reference: 'AUTO',
            seuilMinimum: 0,
            seuilMaximum: 100,
            tauxTVA: 0,
            archivee: false,
            categorie: { nom: '' },
            unite: undefined,
            imageUrl: '',
            description: '',
            details: [{ attributs: {}, codeBarre: '' }]
        };
    }

    initializeDynamicFields(): void {
        if (!this.parametres?.champsPersonnalises || !this.newPiece.details) return;

        const details = this.newPiece.details;
        if (details.length === 0) {
            this.newPiece.details = [{ attributs: {} }];
        }

        const firstDetail = this.newPiece.details[0];

        this.parametres.champsPersonnalises.forEach(champ => {
            if (!(champ.nom in firstDetail.attributs)) {
                firstDetail.attributs[champ.nom] = champ.defaultValue || '';
            }

            const optionsKey = `_options_${champ.nom}`;

            if (champ.variante && details.length > 0) {
                const uniqueValues = new Set<string>();
                details.forEach(d => {
                    if (d.attributs && d.attributs[champ.nom]) {
                        uniqueValues.add(String(d.attributs[champ.nom]));
                    }
                });

                if (uniqueValues.size > 0) {
                    firstDetail.attributs[optionsKey] = Array.from(uniqueValues);
                } else if (!firstDetail.attributs[optionsKey]) {
                    firstDetail.attributs[optionsKey] = [...(champ.options || [])];
                }
            } else if (!firstDetail.attributs[optionsKey]) {
                firstDetail.attributs[optionsKey] = [...(champ.options || [])];
            }
        });
    }

    getLocalOptions(champ: any): string[] {
        if (!this.newPiece.details![0].attributs) return champ.options || [];
        const optionsKey = `_options_${champ.nom}`;
        return this.newPiece.details![0].attributs[optionsKey] || champ.options || [];
    }


    onReferenceChange(ref: string): void {
        if (this.selectedPiece || !ref || ref.length < 5) return;

        this.magasinierService.getPieceByReference(ref).subscribe({
            next: (piece) => {
                if (piece) {
                    this.newPiece.designation = piece.designation;
                    this.newPiece.prixVente = piece.prixVente;
                    this.newPiece.categorie = piece.categorie;
                    this.newPiece.tauxTVA = piece.tauxTVA;
                    this.newPiece.seuilMinimum = piece.seuilMinimum;
                    this.newPiece.seuilMaximum = piece.seuilMaximum;
                    this.newPiece.imageUrl = piece.imageUrl;
                    this.newPiece.description = piece.description;
                    this.imagePreview = piece.imageUrl || null;
                    this.newPiece.produitsAssocies = [...(piece.produitsAssocies || [])];

                    if (piece.details && piece.details.length > 0) {
                        const templateDetail = piece.details[0];
                        const cleanAttributs: any = {};
                        Object.entries(templateDetail.attributs).forEach(([k, v]) => {
                            cleanAttributs[k] = v;
                        });
                        this.newPiece.details = [{ attributs: cleanAttributs, codeBarre: templateDetail.codeBarre || '' }];
                    }
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
            }
        });
    }


    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            this.selectedFile = input.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                this.imagePreview = reader.result as string;
                this.cdr.detectChanges();
            };
            reader.readAsDataURL(this.selectedFile);
        }
    }

    removeImage(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.selectedFile = null;
        this.imagePreview = null;
        this.newPiece.imageUrl = '';
        if (this.selectedPiece) {
            this.selectedPiece.imageUrl = '';
        }
        this.cdr.detectChanges();
    }

    getImageUrl(url: string | null | undefined): string {
        if (!url) return 'assets/images/default-produit.svg';
        if (url.startsWith('data:')) return url;
        if (url.startsWith('/api/images') || url.startsWith('/uploads')) {
            return `http://localhost:8081${url}`;
        }
        return url;
    }

    toggleCategorySelector(event?: Event): void {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.showCategorySelector = !this.showCategorySelector;
        this.cdr.detectChanges();
    }

    selectCategory(cat: Categorie): void {
        this.newPiece.categorie = cat;
        this.showCategorySelector = false;
        this.cdr.detectChanges();
    }

    updateFilteredCategoriesList(): void {
        const term = (this.categorySearchTerm || '').toLowerCase().trim();
        if (!term) {
            this.filteredCategoriesList = [...(this.categories || [])];
        } else {
            this.filteredCategoriesList = (this.categories || []).filter(c =>
                (c.nom || '').toLowerCase().includes(term)
            );
        }
    }

    onCategorySearchChange(): void {
        this.updateFilteredCategoriesList();
        this.cdr.detectChanges();
    }

    openQuickAddCategory(event?: Event): void {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.isAutoCategoryCode = this.isModuleAuto('CATEGORIE');
        this.newCategory = { nom: '', code: this.isAutoCategoryCode ? 'AUTO' : '', description: '' };
        this.showQuickAddCategory = true;
        this.cdr.detectChanges();
    }

    closeQuickAddCategory(): void {
        this.showQuickAddCategory = false;
        this.cdr.detectChanges();
    }

    submitQuickAddCategory(): void {
        if (!this.newCategory.nom || !this.newCategory.code) return;
        this.quickAddCategory.emit({ ...this.newCategory });
        this.showQuickAddCategory = false;
        this.newCategory = { nom: '', code: 'AUTO', description: '' };
    }

    toggleProductSelectorModal(event?: Event): void {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.showProductSelector = !this.showProductSelector;
        this.cdr.detectChanges();
    }

    toggleProductSelection(product: ProduitFini): void {
        if (!this.newPiece.produitsAssocies) this.newPiece.produitsAssocies = [];
        const index = this.newPiece.produitsAssocies.findIndex(p => p.id === product.id);
        if (index === -1) {
            this.newPiece.produitsAssocies.push({ ...product });
        } else {
            this.newPiece.produitsAssocies.splice(index, 1);
        }
        this.cdr.detectChanges();
    }

    isProductSelected(productId?: number): boolean {
        if (!productId || !this.newPiece.produitsAssocies) return false;
        return this.newPiece.produitsAssocies.some(p => p.id === productId);
    }

    removeAssociatedProduct(index: number): void {
        if (this.newPiece.produitsAssocies) {
            this.newPiece.produitsAssocies.splice(index, 1);
            this.cdr.detectChanges();
        }
    }

    updateFilteredProductsList(): void {
        const term = (this.productSearchTerm || '').toLowerCase().trim();
        if (!term) {
            this.filteredProductsList = [...(this.produitsFinis || [])];
        } else {
            this.filteredProductsList = (this.produitsFinis || []).filter(p =>
                (p.designation || '').toLowerCase().includes(term) ||
                (p.code || '').toLowerCase().includes(term)
            );
        }
    }

    onProductSearchChange(): void {
        this.updateFilteredProductsList();
        this.cdr.detectChanges();
    }

    getSelectedProductsCount(): number {
        return this.newPiece.produitsAssocies?.length ?? 0;
    }

    openQuickAddProduct(event?: Event): void {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.isAutoProductCode = this.isModuleAuto('PRODUIT');
        this.newProduct = { code: this.isAutoProductCode ? 'AUTO' : '', designation: '' };
        this.quickProductFile = null;
        this.newProductPreview = null;
        this.showQuickAddProduct = true;
        this.cdr.detectChanges();
    }

    onQuickProductFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            this.quickProductFile = input.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                this.newProductPreview = reader.result as string;
                this.cdr.detectChanges();
            };
            reader.readAsDataURL(this.quickProductFile);
        }
    }

    submitQuickAddProduct(): void {
        if (!this.newProduct.code || !this.newProduct.designation) return;
        this.quickAddProduct.emit({ product: { ...this.newProduct }, file: this.quickProductFile });
        this.showQuickAddProduct = false;
        this.newProduct = { code: 'AUTO', designation: '' };
    }

    closeQuickAddProduct(): void {
        this.showQuickAddProduct = false;
        this.cdr.detectChanges();
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (!this.showCategorySelector) return;

        const target = event.target as HTMLElement;
        const picker = document.querySelector('.picker-container');
        if (picker && !picker.contains(target)) {
            this.showCategorySelector = false;
            this.cdr.detectChanges();
        }
    }

    onFormSubmit(form: any): void {
        this.variantErrors = {};
        let hasVariantErrors = false;

        if (this.parametres?.champsPersonnalises) {
            this.parametres.champsPersonnalises.forEach(champ => {
                if (champ.actif && champ.variante && champ.obligatoire) {
                    const options = this.getLocalOptions(champ);
                    if (!options || options.length === 0) {
                        this.variantErrors[champ.nom] = true;
                        hasVariantErrors = true;
                    }
                }
            });
        }

        // Validate variant detail rows: barcode required, price required
        let hasDetailErrors = false;
        if (this.newPiece.details && this.newPiece.details.length > 0) {
            this.newPiece.details.forEach(detail => {
                if (!detail.codeBarre || detail.codeBarre.trim() === '') {
                    hasDetailErrors = true;
                }
                if (detail.prixVente === null || detail.prixVente === undefined) {
                    hasDetailErrors = true;
                }
            });
        }

        const seuilInvalid = this.newPiece.seuilMaximum < this.newPiece.seuilMinimum;
        this.checkDuplicateBarcodes();
        const hasDuplicateBarcodes = this.barcodeDuplicates.size > 0;

        if (form.invalid || !this.newPiece.categorie?.id || hasVariantErrors || hasDetailErrors || seuilInvalid || hasDuplicateBarcodes) {
            Object.keys(form.controls).forEach(key => {
                form.controls[key].markAsTouched();
            });

            const container = document.querySelector('.odoo-unified-content');
            if (container) {
                container.scrollTo({ top: 0, behavior: 'smooth' });
            }

            if (seuilInvalid) {
                console.warn('Seuil Maximum doit être supérieur au Seuil Minimum');
            }

            this.cdr.detectChanges();
            return;
        }
        this.onSubmit();
    }

    onSubmit(): void {
        console.log('[ANTIGRAVITY] Starting robust onSubmit...');
        const rawPiece = this.newPiece;

        const pieceToSave: any = {
            id: rawPiece.id ? Number(rawPiece.id) : undefined,
            designation: String(rawPiece.designation).trim(),
            prixVente: Number(rawPiece.prixVente || 0),
            reference: String(rawPiece.reference).trim(),
            seuilMinimum: Number(rawPiece.seuilMinimum || 0),
            seuilMaximum: Number(rawPiece.seuilMaximum || 0),
            tauxTVA: Number(rawPiece.tauxTVA || 0),
            archivee: !!rawPiece.archivee,
            imageUrl: rawPiece.imageUrl || null,
            unite: rawPiece.unite?.id ? { id: Number(rawPiece.unite.id) } : null,
            categorie: rawPiece.categorie?.id ? { id: Number(rawPiece.categorie.id) } : null,
            description: String(rawPiece.description || '').trim()
        };

        pieceToSave.produitsAssocies = (rawPiece.produitsAssocies || [])
            .map(p => ({
                id: Number(p.id),
                code: p.code,
                designation: p.designation
            }));

        if (pieceToSave.imageUrl && pieceToSave.imageUrl.includes('http://localhost:8081')) {
            pieceToSave.imageUrl = pieceToSave.imageUrl.replace('http://localhost:8081', '');
        }

        const seenIds = new Set<number>();
        pieceToSave.details = [];

        if (rawPiece.details) {
            rawPiece.details.forEach(d => {
                const cleanAttributs: any = {};
                if (d.attributs) {
                    Object.entries(d.attributs).forEach(([key, val]) => {
                        if (!key.startsWith('_') && val !== null && val !== undefined) {
                            cleanAttributs[key] = val;
                        }
                    });
                }

                const detailObj: any = {
                    codeBarre: d.codeBarre?.trim() || null,
                    attributs: cleanAttributs,
                    prixVente: d.prixVente != null ? Number(d.prixVente) : 0,
                    tauxTVA: d.tauxTVA != null ? Number(d.tauxTVA) : 0
                };

                if (d.id) {
                    const idNum = Number(d.id);
                    if (seenIds.has(idNum)) return;
                    seenIds.add(idNum);
                    detailObj.id = idNum;
                }

                pieceToSave.details.push(detailObj);
            });
        }

        console.log('[ANTIGRAVITY] FINAL VALIDATED PAYLOAD:', JSON.stringify(pieceToSave));
        this.save.emit({ piece: pieceToSave, file: this.selectedFile });
    }

    private handleBackendError(error: string): void {
        const match = error.match(/Le code barre '(.+?)'/);
        if (match && match[1]) {
            this.backendBarcodeErrors.add(match[1]);
        }
    }

    checkDuplicateBarcodes(): void {
        this.barcodeDuplicates.clear();
        if (!this.newPiece.details) return;

        const codes = this.newPiece.details.map(d => d.codeBarre?.trim()).filter(c => !!c);
        const counts: { [key: string]: number[] } = {};

        this.newPiece.details.forEach((detail, index) => {
            const code = detail.codeBarre?.trim();
            if (code) {
                if (!counts[code]) counts[code] = [];
                counts[code].push(index);
            }
        });

        Object.values(counts).forEach(indices => {
            if (indices.length > 1) {
                indices.forEach(idx => this.barcodeDuplicates.add(idx));
            }
        });
        this.cdr.detectChanges();
    }

    hasEmptyDetailBarcodes(): boolean {
        if (!this.newPiece.details || this.newPiece.details.length === 0) return false;
        return this.newPiece.details.some(d => !d.codeBarre || d.codeBarre.trim() === '');
    }

    hasEmptyDetailPrices(): boolean {
        if (!this.newPiece.details || this.newPiece.details.length === 0) return false;
        return this.newPiece.details.some(d => d.prixVente === null || d.prixVente === undefined);
    }

    onCancel(): void {
        this.cancel.emit();
    }

    addVariantOption(champ: any, input: HTMLInputElement): void {
        const value = input.value.trim();
        if (!value) return;

        const optionsKey = `_options_${champ.nom}`;
        if (!this.newPiece.details![0].attributs[optionsKey]) {
            this.newPiece.details![0].attributs[optionsKey] = [];
        }

        const localOptions = this.newPiece.details![0].attributs[optionsKey];
        if (localOptions.includes(value)) {
            input.value = '';
            return;
        }

        localOptions.push(value);
        input.value = '';
        this.generateVariations();
        this.cdr.detectChanges();
    }

    openConfirmRemove(champ: any, option: string, event: MouseEvent): void {
        event.stopPropagation();
        console.log('Opening confirm delete for:', option, 'in champ:', champ.nom);

        this.champToRemoveFrom = champ;
        this.optionToRemove = option;
        this.showConfirmModal = true;
        this.cdr.detectChanges();
    }

    cancelRemove(): void {
        this.showConfirmModal = false;
        this.champToRemoveFrom = null;
        this.optionToRemove = '';
        this.cdr.detectChanges();
    }

    confirmRemoveOption(): void {
        if (this.champToRemoveFrom && this.optionToRemove) {
            console.log('Confirming delete of:', this.optionToRemove);
            const optionsKey = `_options_${this.champToRemoveFrom.nom}`;
            const localOptions = this.newPiece.details![0].attributs[optionsKey];

            this.newPiece.details![0].attributs[optionsKey] = localOptions.filter((o: string) => o !== this.optionToRemove);

            if (this.newPiece.details![0].attributs[this.champToRemoveFrom.nom] === this.optionToRemove) {
                this.newPiece.details![0].attributs[this.champToRemoveFrom.nom] = '';
            }
            this.generateVariations();
            this.cdr.detectChanges();
        }
        this.cancelRemove();
    }

    hasVisibleFields(isVariant: boolean): boolean {
        if (!this.parametres?.champsPersonnalises) return false;
        return this.parametres.champsPersonnalises.some(c => c.actif && c.variante === isVariant);
    }

    getVariantLabel(detail: any): string {
        const attributes = detail.attributs || {};

        const labelParts: string[] = [];
        for (const [key, value] of Object.entries(attributes)) {
            if (key.startsWith('_')) continue;
            if (value === null || value === undefined || String(value).trim() === '') continue;

            labelParts.push(`${key}: ${value}`);
        }

        const label = labelParts.join(' | ');
        return label || 'Standard';
    }

    generateVariations(): void {
        if (!this.parametres?.champsPersonnalises || !this.newPiece.details || !this.newPiece.details.length) return;

        const templateDetail = this.newPiece.details[0];
        const variantChamps = this.parametres.champsPersonnalises.filter(c => c.variante && c.actif);

        if (variantChamps.length === 0) return;

        const baseAttributs: { [key: string]: any } = {};
        Object.entries(templateDetail.attributs).forEach(([key, value]) => {
            const isVariant = variantChamps.some(c => c.nom === key);
            if (!isVariant || key.startsWith('_')) {
                baseAttributs[key] = value;
            }
        });

        const variantOptions: { champ: string, options: string[] }[] = [];
        variantChamps.forEach(champ => {
            const options = this.getLocalOptions(champ);
            if (options.length > 0) {
                variantOptions.push({ champ: champ.nom, options });
            }
        });

        if (variantOptions.length === 0) {
            this.newPiece.details = [this.newPiece.details[0]];
            return;
        }

        let combinations: { [key: string]: any }[] = [{ ...baseAttributs }];

        variantOptions.forEach(variant => {
            const nextCombinations: { [key: string]: any }[] = [];
            combinations.forEach(combo => {
                variant.options.forEach(opt => {
                    nextCombinations.push({ ...combo, [variant.champ]: opt });
                });
            });
            combinations = nextCombinations;
        });

        const existingDetails = [...this.newPiece.details];

        this.newPiece.details = combinations.map((combo, index) => {
            // Find an exact match first
            let exactMatchIndex = existingDetails.findIndex(d => {
                const targetAttrs = d.attributs || {};
                return variantOptions.every(v => String(targetAttrs[v.champ]) === String(combo[v.champ]));
            });

            if (exactMatchIndex > -1) {
                const existing = existingDetails.splice(exactMatchIndex, 1)[0];
                return {
                    id: existing.id,
                    codeBarre: existing.codeBarre,
                    prixVente: existing.prixVente,
                    tauxTVA: existing.tauxTVA,
                    attributs: { ...combo, ...this.extractOptions(existing.attributs) }
                };
            }

            // Find a partial match just to inherit prices/taxes, NOT IDs or Barcodes to prevent swapping issues
            let partialMatchIndex = existingDetails.findIndex(d => {
                const targetAttrs = d.attributs || {};
                let matchScore = 0;
                variantOptions.forEach(v => {
                    const existingVal = targetAttrs[v.champ];
                    if (String(existingVal) === String(combo[v.champ])) matchScore++;
                });
                return matchScore > 0; // if it shares at least one trait we can use its price
            });

            let inheritedPrice = templateDetail.prixVente || 0;
            let inheritedTax = templateDetail.tauxTVA || 0;

            if (partialMatchIndex > -1) {
                inheritedPrice = existingDetails[partialMatchIndex].prixVente || 0;
                inheritedTax = existingDetails[partialMatchIndex].tauxTVA || 0;
            }

            return {
                attributs: { ...combo, ...this.extractOptions(templateDetail.attributs) },
                codeBarre: '',
                prixVente: inheritedPrice,
                tauxTVA: inheritedTax
            };
        });

        Object.entries(baseAttributs).forEach(([key, value]) => {
            if (key.startsWith('_')) {
                this.newPiece.details![0].attributs[key] = value;
            }
        });
    }

    private extractOptions(attributes: any): any {
        const ops: any = {};
        Object.keys(attributes || {}).forEach(k => {
            if (k.startsWith('_options_')) ops[k] = attributes[k];
        });
        return ops;
    }

    syncComplementaryAttributes(): void {
        if (!this.newPiece.details || this.newPiece.details.length <= 1) return;
        const template = this.newPiece.details[0].attributs;

        const variantChamps = this.parametres?.champsPersonnalises?.filter(c => c.variante && c.actif).map(c => c.nom) || [];

        const updates: any = {};
        Object.keys(template).forEach(k => {
            if (!k.startsWith('_') && !variantChamps.includes(k)) {
                updates[k] = template[k];
            }
        });

        for (let i = 1; i < this.newPiece.details.length; i++) {
            this.newPiece.details[i].attributs = {
                ...this.newPiece.details[i].attributs,
                ...updates
            };
        }
        this.cdr.detectChanges();
    }

    compareById(item1: any, item2: any): boolean {
        return item1 && item2 ? item1.id === item2.id : item1 === item2;
    }



    copyVenteToAll(): void {
        if (!this.newPiece.details || this.newPiece.details.length <= 1) return;
        const value = this.newPiece.details[0].prixVente || 0;
        this.newPiece.details.forEach((d, i) => { if (i > 0) d.prixVente = value; });
        this.cdr.detectChanges();
    }

    copyTaxToAll(): void {
        if (!this.newPiece.details || this.newPiece.details.length <= 1) return;
        const value = this.newPiece.details[0].tauxTVA || 0;
        this.newPiece.details.forEach((d, i) => { if (i > 0) d.tauxTVA = value; });
        this.cdr.detectChanges();
    }

    copyBarcodesToAll(): void {
        if (!this.newPiece.details || this.newPiece.details.length <= 1) return;
        const base = this.newPiece.details[0].codeBarre || '';
        if (!base) return;

        this.newPiece.details.forEach((d, i) => {
            if (i > 0 && !d.id) {
                d.codeBarre = base + i;
            }
        });
        this.cdr.detectChanges();
    }

    generateVariantSKU(index: number): void {
        if (!this.newPiece.details || !this.newPiece.details[index]) return;
        if (this.newPiece.details[index].id) return; // Do not overwrite saved barcodes

        const prefix = "300";
        const randomPart = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
        const barcode = prefix + randomPart + index;
        this.newPiece.details[index].codeBarre = barcode.substring(0, 13);
        this.cdr.detectChanges();
    }

    removeVariant(index: number): void {
        if (this.newPiece.details && this.newPiece.details[index]) {
            // Au lieu de supprimer la ligne, on vide les champs pour éviter les erreurs de suppression en BD
            this.newPiece.details[index].codeBarre = '';
            this.newPiece.details[index].prixVente = 0;
            this.newPiece.details[index].tauxTVA = 0;
            this.cdr.detectChanges();
        }
    }
}
