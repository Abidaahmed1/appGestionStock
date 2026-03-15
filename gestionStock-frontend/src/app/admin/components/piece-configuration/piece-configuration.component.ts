import { Component, OnInit, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ParametreService, Parametre, ChampPersonnalise, TypeChamp } from '../../services/parametre.service';

@Component({
    selector: 'app-piece-configuration',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './piece-configuration.component.html',
    styleUrls: ['./piece-configuration.component.css']
})
export class PieceConfigurationComponent implements OnInit {
    parametre: Parametre | null = null;
    champs: ChampPersonnalise[] = [];
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
        { value: TypeChamp.SELECT, label: 'Liste déroulante' },
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

        this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
                this.ngZone.run(() => {
                    if (this.loading) {
                        this.loading = false;
                        this.errorMessage = "Le serveur est trop lent à répondre.";
                    }
                });
            }, 5000);
        });

        // Utilise /api/parametres/current : le backend détermine l'entreprise
        // du user connecté automatiquement (via getCurrentUserEntreprise())
        this.parametreService.getCurrentParametre().subscribe({
            next: (data) => {
                this.parametre = data;
                this.entrepriseId = data.entreprise?.id ?? this.entrepriseId;
                this.champs = data.champsPersonnalises.map(c => ({
                    ...c,
                    options: c.options || []
                }));

                // Dynamisation de l'affichage de la référence selon la configuration de numérotation
                if (data.numerotationConfigs) {
                    const pieceConfig = data.numerotationConfigs.find(c => c.module === 'PIECE');
                    if (pieceConfig) {
                        const referenceAttr = this.defaultAttributes.find(a => a.nom === 'Référence');
                        if (referenceAttr) {
                            referenceAttr.type = `Texte (${pieceConfig.prefix}*)`;
                        }
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
        const nouveauChamp: ChampPersonnalise = {
            nom: '',
            type: TypeChamp.TEXT,
            obligatoire: false,
            variante: false,
            options: [],
            ordre: this.champs.length,
            actif: true,
            description: '',
            defaultValue: ''
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
        if (champ.type !== TypeChamp.SELECT && !champ.variante) {
            champ.options = [];
        }
    }

    addOption(champ: ChampPersonnalise, input: HTMLInputElement): void {
        const value = input.value.trim();
        if (value && !champ.options.includes(value)) {
            champ.options.push(value);
            input.value = '';
        }
    }

    save(): void {
        if (!this.parametre || !this.parametre.id) {
            this.errorMessage = "Impossible d'enregistrer : ID du paramètre manquant.";
            return;
        }

        this.loading = true;
        this.errorMessage = null;

        const finalChamps = this.champs.map(c => {
            const { selected, ...rest } = c as any;
            return rest as ChampPersonnalise;
        });

        const updatedParametre: Parametre = {
            ...this.parametre,
            champsPersonnalises: finalChamps
        };

        this.parametreService.updateParametre(this.parametre.id, updatedParametre).subscribe({
            next: (data) => {
                this.parametre = data;
                this.champs = data.champsPersonnalises.map(c => ({
                    ...c,
                    options: c.options || []
                }));
                this.loading = false;
                this.notify('Configuration enregistrée avec succès !', 'success');
            },
            error: (err) => {
                console.error('Erreur lors de l\'enregistrement', err);
                this.loading = false;
                this.errorMessage = "Erreur lors de l'enregistrement des modifications.";
            }
        });
    }

    goBack(): void {
        this.router.navigate(['/admin/settings']);
    }
}
