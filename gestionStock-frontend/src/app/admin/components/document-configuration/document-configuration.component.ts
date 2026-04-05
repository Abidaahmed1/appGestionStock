import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DocumentConfigService, DocumentDisplaySetting, DocumentType } from '../../services/document-config.service';
import { ParametreService, Parametre } from '../../services/parametre.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-document-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './document-configuration.component.html',
  styleUrls: ['./document-configuration.component.css']
})
export class DocumentConfigurationComponent implements OnInit {
  documentTypes = [
    { value: DocumentType.BON_ENTREE, label: "Bon d'Entrée" },
    { value: DocumentType.BON_SORTIE, label: "Bon de Sortie" },
    { value: DocumentType.BON_RETOUR, label: "Bon de Retour" },
    { value: DocumentType.COMMANDE_FOURNISSEUR, label: "Commande Fournisseur" },
    { value: DocumentType.INVENTAIRE, label: "Rapport d'Inventaire" }
  ];

  selectedType: DocumentType = DocumentType.BON_ENTREE;
  currentSetting: DocumentDisplaySetting | null = null;
  allVariantes: Parametre[] = [];
  loading = false;
  saving = false;
  showConfirmModal = false;
  notification: { message: string, type: 'success' | 'error' } | null = null;
  presetColors: string[] = ['#84CC16', '#0D9488', '#2563EB', '#6366F1', '#D97706', '#E11D48', '#960d5d', '#000000'];

  constructor(
    private docConfigService: DocumentConfigService,
    private parametreService: ParametreService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadVariantes();
      this.loadSetting(this.selectedType);
    }
  }

  loadVariantes(): void {
    this.parametreService.getCurrentParametres().subscribe(params => {
      this.allVariantes = (params || []).filter(p => p.variante && p.actif);
    });
  }

  loadSetting(type: DocumentType): void {
    this.selectedType = type;
    this.loading = true;
    this.docConfigService.getSettingByType(type).subscribe({
      next: (setting) => {
        this.currentSetting = setting;
        this.loading = false;
      },
      error: () => {
        this.currentSetting = {
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
        this.loading = false;
      }
    });
  }

  notify(message: string, type: 'success' | 'error'): void {
    this.notification = { message, type };
    setTimeout(() => {
      if (this.notification?.message === message) {
        this.notification = null;
      }
    }, 5000);
  }

  getVariantName(id: number): string {
    return this.allVariantes.find(v => v.id === id)?.nom || 'Attribut';
  }

  isVarianteSelected(id: number): boolean {
    return this.currentSetting?.visibleVarianteIds.includes(id) || false;
  }

  toggleVariante(id: number): void {
    if (!this.currentSetting) return;

    const index = this.currentSetting.visibleVarianteIds.indexOf(id);
    if (index === -1) {
      this.currentSetting.visibleVarianteIds.push(id);
    } else {
      this.currentSetting.visibleVarianteIds.splice(index, 1);
    }
  }

  save(): void {
    if (!this.currentSetting) return;
    this.showConfirmModal = true;
  }

  confirmSave(applyToAll: boolean): void {
    this.showConfirmModal = false;
    this.saving = true;

    if (applyToAll) {
      this.performApplyToAll();
    } else {
      this.performSingleSave();
    }
  }

  private performSingleSave(): void {
    if (!this.currentSetting) return;

    this.docConfigService.updateSetting(this.currentSetting).subscribe({
      next: (res) => {
        this.currentSetting = res;
        this.notify('Configuration enregistrée avec succès !', 'success');
        this.saving = false;
      },
      error: (err) => {
        console.error('Erreur lors de la sauvegarde :', err);
        this.notify('Erreur lors de l’enregistrement', 'error');
        this.saving = false;
      }
    });
  }

  private performApplyToAll(): void {
    if (!this.currentSetting) return;
    this.loading = true;
    
    const typesToUpdate = this.documentTypes.map(t => t.value).filter(val => val !== this.selectedType);
    if (typesToUpdate.length === 0) {
        this.performSingleSave();
        this.loading = false;
        return;
    }

    const fetchOps = typesToUpdate.map(t => this.docConfigService.getSettingByType(t));
    
    forkJoin(fetchOps).subscribe({
      next: (settingsArray) => {
        const _src = this.currentSetting!;
        const updateOps = settingsArray.map(existingSetting => {
          const newSetting: DocumentDisplaySetting = {
             ...existingSetting,
             primaryColor: _src.primaryColor,
             secondaryColor: _src.secondaryColor,
             layout: _src.layout,
             fontSize: _src.fontSize,
             showLogo: _src.showLogo,
             showSignatureClient: _src.showSignatureClient,
             showSignatureMagasinier: _src.showSignatureMagasinier,
             showPriceHT: _src.showPriceHT,
             showTVA: _src.showTVA,
             showDiscount: _src.showDiscount,
             footerText: _src.footerText,
             visibleVarianteIds: [..._src.visibleVarianteIds]
          };
          return this.docConfigService.updateSetting(newSetting);
        });

        // Also save current
        updateOps.push(this.docConfigService.updateSetting(_src));

        forkJoin(updateOps).subscribe({
           next: () => {
              this.loading = false;
              this.saving = false;
              this.notify('Style appliqué à TOUS les documents avec succès !', 'success');
           },
           error: () => {
              this.loading = false;
              this.saving = false;
              this.notify('Erreur lors de l\'application globale', 'error');
           }
        });
      },
      error: (err) => {
         console.error('Erreur globale :', err);
         this.loading = false;
         this.saving = false;
         this.notify('Erreur lors du chargement des autres configurations', 'error');
      }
    });
  }
}
