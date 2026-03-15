import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LogistiqueService } from '../../services/logistique.service';
import { MagasinierService } from '../../../magasinier/services/magasinier.service';
import { Fournisseur } from '../../models/logistique.models';
import { SupplierCatalogComponent } from '../supplier-catalog/supplier-catalog.component';
import { forkJoin } from 'rxjs';
import { ViewChild } from '@angular/core';

@Component({
    selector: 'app-fournisseur-details',
    standalone: true,
    imports: [CommonModule, FormsModule, SupplierCatalogComponent],
    templateUrl: './fournisseur-details.component.html',
    styleUrl: './fournisseur-details.component.css'
})
export class FournisseurDetailsComponent implements OnInit {
    fournisseur: Fournisseur = this.initNewFournisseur();
    isEdit = false;
    notification: { message: string, type: 'success' | 'error' } | null = null;
    activeTab: string = 'articles';
    validationErrors: any = {};
    hasOrderDraft = false;
    isAutoCode = true;
    parametres: any = null;



    @ViewChild('catalog') catalog!: SupplierCatalogComponent;

    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private logistiqueService = inject(LogistiqueService);
    private magasinierService = inject(MagasinierService);
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            const id = this.route.snapshot.paramMap.get('id');
            if (id && id !== 'nouveau') {
                this.isEdit = true;
                this.loadFournisseur(+id);
            }

            this.hasOrderDraft = !!this.logistiqueService.commandeDraft;

            if (history.state && history.state.message) {
                setTimeout(() => {
                    this.notify(history.state.message, 'success');
                }, 100);
            }
            this.loadParametres();
        }
    }

    loadParametres() {
        this.magasinierService.getAllParametres().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                    this.parametres = data[0];
                    if (!this.isEdit) {
                        this.isAutoCode = this.isModuleAuto('FOURNISSEUR');
                        this.fournisseur.code = this.isAutoCode ? 'AUTO' : '';
                    }
                    this.cdr.detectChanges();
                }
            },
            error: (err) => console.error('Erreur chargement paramètres:', err)
        });
    }

    isModuleAuto(moduleName: string): boolean {
        if (!this.parametres?.numerotationConfigs) return true;
        const config = this.parametres.numerotationConfigs.find((c: any) => c.module === moduleName);
        return config ? config.automatique !== false : true;
    }

    getPrefix(moduleName: string): string {
        const config = this.parametres?.numerotationConfigs?.find((c: any) => c.module === moduleName);
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
        
        if (parts.length > 0) {
            return `Astuce : La référence inclut ${parts.join(', ')} suivis d'un numéro de séquence.`;
        }
        return 'Séquence simple (sans date)';
    }

    initNewFournisseur(): Fournisseur {
        return {
            code: 'AUTO',
            nom: '',
            adresse: '',
            email: '',
            tel: ''
        };
    }

    loadFournisseur(id: number) {
        this.logistiqueService.getFournisseurById(id).subscribe({
            next: (data) => {
                this.fournisseur = data;
                this.isAutoCode = this.fournisseur.code === 'AUTO';
            },
            error: () => this.notify('Erreur lors du chargement', 'error')
        });
    }

    save() {
        this.validationErrors = {};
        let hasErrors = false;

        if (!this.fournisseur.nom) {
            this.validationErrors.nom = true;
            hasErrors = true;
        }
        if (!this.fournisseur.code) {
            this.validationErrors.code = true;
            hasErrors = true;
        } else if (this.fournisseur.code !== 'AUTO' && this.fournisseur.code.length < 2) {
            this.validationErrors.codePattern = true;
            hasErrors = true;
        }
        if (!this.fournisseur.tel) {
            this.validationErrors.tel = true;
            hasErrors = true;
        } else if (this.fournisseur.tel.length !== 8) {
            this.validationErrors.telLength = true;
            hasErrors = true;
        }

        if (!this.fournisseur.email) {
            this.validationErrors.email = true;
            hasErrors = true;
        } else if (this.fournisseur.email && !this.fournisseur.email.includes('@')) {
            this.notify('Format d\'e-mail invalide', 'error');
            return;
        }

        if (!this.fournisseur.adresse) {
            this.validationErrors.adresse = true;
            hasErrors = true;
        }

        if (hasErrors) {
            let errorMsg = 'Veuillez remplir les champs obligatoires.';
            if (this.validationErrors.telLength) {
                errorMsg = 'Le numéro de téléphone doit contenir exactement 8 chiffres.';
            } else if (this.validationErrors.codePattern) {
                errorMsg = 'Le code du fournisseur est invalide.';
            }
            this.notify(errorMsg, 'error');
            return;
        }

        const obs = this.isEdit && this.fournisseur.id
            ? this.logistiqueService.updateFournisseur(this.fournisseur.id, this.fournisseur)
            : this.logistiqueService.createFournisseur(this.fournisseur);

        obs.subscribe({
            next: (savedFournisseur) => {
                const wasNew = !this.isEdit;
                this.fournisseur = savedFournisseur;
                this.isEdit = true;
                this.validationErrors = {};

                const successMsg = wasNew
                    ? 'Félicitations ! Le fournisseur a été créé avec succès.'
                    : 'Le fournisseur a été mis à jour avec succès.';

                this.notify(successMsg, 'success');

                if (this.catalog) {
                    this.catalog.saveAll(savedFournisseur);
                }

                if (wasNew) {
                    this.router.navigate(['/logistique/fournisseurs', savedFournisseur.id], {
                        replaceUrl: true,
                        state: { message: successMsg }
                    });
                } else {
                    this.notify(successMsg, 'success');
                }
            },
            error: (err) => {
                const msg = this.extractErrorMessage(err, 'Erreur lors de l\'enregistrement du fournisseur.');
                this.notify(msg, 'error');
            }
        });
    }

    goBack() {
        if (this.hasOrderDraft) {
            const draft = this.logistiqueService.commandeDraft;
            if (draft) {
                const url = draft.id ? `/logistique/commandes/${draft.id}` : '/logistique/commandes/nouvelle';
                this.router.navigate([url]);
            } else {
                this.router.navigate(['/logistique/fournisseurs']);
            }
        } else {
            this.router.navigate(['/logistique/fournisseurs']);
        }
    }

    closeNotification() {
        this.notification = null;
        if (isPlatformBrowser(this.platformId)) {
            this.cdr.detectChanges();
        }
    }

    notify(message: string, type: 'success' | 'error') {
        this.notification = { message, type };
        if (isPlatformBrowser(this.platformId)) {
            this.cdr.detectChanges();
            setTimeout(() => {
                if (this.notification?.message === message) {
                    this.notification = null;
                    this.cdr.detectChanges();
                }
            }, 5000);
        }
    }


    extractErrorMessage(err: any, defaultMsg: string): string {
        if (typeof err.error === 'object' && err.error !== null) {
            if (err.error?.details && typeof err.error.details === 'object') {
                const detailsStr = Object.values(err.error.details).join(', ');
                if (detailsStr) return detailsStr;
            }
            const m = err.error?.message || err.error?.error || err.error?.detail;
            if (m && typeof m === 'string' && m.length < 300 && !m.includes('com.') && !m.includes('java.')) {
                return m;
            }
        }
        if (typeof err.error === 'string' && err.error.length < 250
            && !err.error.includes('com.') && !err.error.includes('at ')) {
            return err.error;
        }
        if (err.status === 400) return 'Données invalides. Veuillez vérifier les champs saisis.';
        if (err.status === 409) return 'Ce code fournisseur existe déjà.';
        if (err.status === 404) return 'Fournisseur introuvable.';
        if (err.status === 500) return 'Une erreur serveur est survenue. Veuillez réessayer.';
        return defaultMsg;
    }

    setTab(tab: string) {
        this.activeTab = tab;
        this.cdr.detectChanges();
    }

}
