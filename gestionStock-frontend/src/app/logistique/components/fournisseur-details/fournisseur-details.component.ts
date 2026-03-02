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
        }
    }

    initNewFournisseur(): Fournisseur {
        return {
            code: '',
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
        } else if (!this.fournisseur.code.startsWith('FOUR-')) {
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
                errorMsg = 'Le code du fournisseur doit commencer par FOUR-';
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
                    this.catalog.saveAll();
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
                let msg = err.error?.message || 'Erreur lors de l\'enregistrement';
                if (err.error?.details) {
                    const detailsStr = Object.values(err.error.details).join(', ');
                    if (detailsStr) {
                        msg = msg + ': ' + detailsStr;
                    }
                } else if (typeof err.error === 'string') {
                    msg = err.error;
                }
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

    setTab(tab: string) {
        this.activeTab = tab;
        this.cdr.detectChanges();
    }
}
