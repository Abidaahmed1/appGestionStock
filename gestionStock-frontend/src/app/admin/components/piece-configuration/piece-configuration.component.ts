import { Component, OnInit, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ParametreService, Parametre, TypeChamp, NumerotationConfig } from '../../services/parametre.service';

@Component({
    selector: 'app-piece-configuration',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './piece-configuration.component.html',
    styleUrls: ['./piece-configuration.component.css']
})
export class PieceConfigurationComponent implements OnInit {
    parametre: Parametre | null = null;
    champs: Parametre[] = [];
    loading = true;
    errorMessage: string | null = null;
    notification: { message: string, type: 'success' | 'error' } | null = null;
    entrepriseId: number = 1;
    fieldToDelete: number | null = null;
    selectAll: boolean = false;
    isAnySelected: boolean = false;

    typesChamps = [
        { value: TypeChamp.TEXT, label: 'Texte' },
        { value: TypeChamp.NUMBER, label: 'Nombre' },
        { value: TypeChamp.BOOLEAN, label: 'Oui/Non' },
        { value: TypeChamp.DATE, label: 'Date' },

        { value: TypeChamp.LISTE, label: 'Liste de valeurs' },
        { value: TypeChamp.EMAIL, label: 'Email' },
        { value: TypeChamp.URL, label: 'URL' },
        { value: TypeChamp.TEXTAREA, label: 'Zone de texte' }
    ];

    activeTab = 'info';

    defaultAttributes = [
        { nom: 'Code Barre', type: 'Texte / Scan', description: 'Identifiant unique de la pièce' },
        { nom: 'Désignation', type: 'Texte', description: 'Nom complet de la pièce' },
        { nom: 'Référence', type: 'Texte (REF-*)', description: 'Référence interne structurée' },
        { nom: 'Prix de Vente', type: 'Nombre', description: 'Prix unitaire hors taxes' },
        { nom: 'Seuil Minimum', type: 'Nombre', description: 'Alerte de stock bas' },
        { nom: 'Seuil Maximum', type: 'Nombre', description: 'Limite de stockage' },
        { nom: 'Taux TVA', type: 'Nombre (%)', description: 'Taxe sur la valeur ajoutée' },
        { nom: 'Catégorie', type: 'Liste (Relation)', description: 'Groupe de classification' },
        { nom: 'Image', type: 'URL / Image', description: 'Aperçu visuel de la pièce' }
    ];

    constructor(
        private parametreService: ParametreService,
        private router: Router,
        private ngZone: NgZone,
        @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    ngOnInit(): void {
        if (isPlatformBrowser(this.platformId)) {
            this.initialiserDonnees();
        } else {
            this.loading = false;
        }
    }

    private initialiserDonnees(): void {
        this.loadParametres();
    }

    loadParametres(): void {
        this.loading = true;
        this.errorMessage = null;

        this.parametreService.getCurrentParametres().subscribe({
            next: (data) => {
                this.champs = (data || []).map(c => ({
                    ...c,
                    options: c.options || [],
                    selected: false
                })).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

                const pieceConfig = this.champs.find(p => p.numerotationConfigs?.some((nc: NumerotationConfig) => nc.module === 'PIECE'))
                    ?.numerotationConfigs?.find((nc: NumerotationConfig) => nc.module === 'PIECE');

                if (pieceConfig) {
                    const referenceAttr = this.defaultAttributes.find(a => a.nom === 'Référence');
                    if (referenceAttr) {
                        referenceAttr.type = `Texte (${pieceConfig.prefix}*)`;
                    }
                }

                this.loading = false;
            },
            error: (err) => {
                console.error('Erreur chargement paramètres', err);
                this.errorMessage = "Impossible de contacter le serveur.";
                this.loading = false;
            }
        });
    }

    notify(message: string, type: 'success' | 'error'): void {
        this.notification = { message, type };
        if (isPlatformBrowser(this.platformId)) {
            setTimeout(() => {
                if (this.notification?.message === message) {
                    this.notification = null;
                }
            }, 5000);
        }
    }

    ajouterLigne(): void {
        const nouveauChamp: Parametre = {
            nom: '',
            type: TypeChamp.TEXT,
            obligatoire: false,
            variante: false,
            options: [],
            ordre: this.champs.length,
            actif: true,
            description: '',
            defaultValue: '',
            numerotationConfigs: []
        };
        this.champs.push(nouveauChamp);
    }

    supprimerLigne(index: number): void {
        this.fieldToDelete = index;
    }

    confirmerSuppression(): void {
        if (this.fieldToDelete !== null) {
            this.champs.splice(this.fieldToDelete, 1);
            this.fieldToDelete = null;
            this.updateSelectionStatus();
        }
    }

    toggleSelectAll(): void {
        this.champs.forEach(c => (c as any).selected = this.selectAll);
        this.updateSelectionStatus();
    }

    onSelectionChange(): void {
        this.selectAll = this.champs.length > 0 && this.champs.every(c => (c as any).selected);
        this.updateSelectionStatus();
    }

    updateSelectionStatus(): void {
        this.isAnySelected = this.champs.some(c => (c as any).selected);
    }

    showBulkConfirm: boolean = false;

    ouvrirConfirmationGroupee(): void {
        this.showBulkConfirm = true;
    }

    confirmerSuppressionGroupee(): void {
        this.supprimerSelection();
        this.showBulkConfirm = false;
    }

    supprimerSelection(): void {
        this.champs = this.champs.filter(c => !(c as any).selected);
        this.selectAll = false;
        this.isAnySelected = false;
    }

    getSelectedCount(): number {
        return this.champs.filter(c => (c as any).selected).length;
    }

    onTypeChange(index: number): void {
        const champ = this.champs[index];
        if (champ.type !== TypeChamp.SELECT && champ.type !== TypeChamp.LISTE && !champ.variante) {
            champ.options = [];
        }
    }

    addOption(champ: Parametre, input: HTMLInputElement): void {
        const value = input.value.trim();
        if (value && !champ.options.includes(value)) {
            champ.options.push(value);
            input.value = '';
        }
    }

    save(): void {
        this.loading = true;
        this.errorMessage = null;

        const finalChamps = this.champs.map((c, index) => {
            const { selected, ...rest } = c as any;
            return { ...rest, ordre: index };
        });

        this.parametreService.updateParametresBulk(finalChamps).subscribe({
            next: (data: Parametre[]) => {
                this.champs = (data || []).map((c: Parametre) => ({
                    ...c,
                    options: c.options || [],
                    selected: false
                })).sort((a: Parametre, b: Parametre) => (a.ordre || 0) - (b.ordre || 0));

                this.loading = false;
                this.notify('Configuration enregistrée avec succès !', 'success');
            },
            error: (err: any) => {
                console.error('Erreur lors de l\'enregistrement', err);
                this.loading = false;
                this.errorMessage = err.error?.message || "Erreur lors de l'enregistrement des modifications (Conflit).";
            }
        });
    }

    goBack(): void {
        this.router.navigate(['/admin/settings']);
    }
}
