import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ParametreService, NumerotationConfig, Parametre } from '../../services/parametre.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Subject, Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../shared/guards/can-deactivate.guard';

@Component({
  selector: 'app-numerotation-gestion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ConfirmDialogComponent],
  templateUrl: './numerotation-gestion.component.html',
  styleUrl: './numerotation-gestion.component.css'
})
export class NumerotationGestionComponent implements OnInit, CanComponentDeactivate {
  configs: NumerotationConfig[] = [];
  parametre: Parametre | null = null;
  loading = true;
  saving = false;
  notification: { message: string, type: 'success' | 'alert' } | null = null;
  
  initialConfigs: string = '';
  showConfirmDialog = false;
  private deactivateSubject = new Subject<boolean>();

  modulesMap: { [key: string]: string } = {
    'PIECE': 'Pièce détachée',
    'PRODUIT': 'Produit fini',
    'CATEGORIE': 'Catégorie',
    'BON_COMMANDE': 'Bon de commande',
    'BON_SORTIE': 'Bon de sortie',
    'BON_ENTREE': 'Bon d\'entrée',
    'BON_RETOUR': 'Bon de retour',
    'FOURNISSEUR': 'Fournisseur'
  };

  constructor(private parametreService: ParametreService) { }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.configs.forEach((c) => c.showMenu = false);
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.parametreService.getNumerotationConfigs().subscribe({
      next: (configs) => {
        this.configs = configs || [];
        this.ensureDefaultModules();
        this.initialConfigs = JSON.stringify(this.configs);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading numbering configs', err);
        this.ensureDefaultModules();
        this.loading = false;
      }
    });
  }

  ensureDefaultModules(): void {
    const existingModules = this.configs.map(c => c.module);
    Object.keys(this.modulesMap).forEach(module => {
      if (!existingModules.includes(module)) {
        this.configs.push({
          module: module,
          prefix: module === 'PIECE' ? 'REF-' : (module + '-'),
          numeroDebut: '00001',
          redemarrer: 'AUCUN',
          automatique: true,
          actif: true
        });
      }
    });
  }

  getModuleName(module: string): string {
    return this.modulesMap[module] || module;
  }

  getPreview(config: NumerotationConfig): string {
    const now = new Date();
    let preview = config.prefix || '';

    preview = preview
      .replace(/%YYYY%/g, now.getFullYear().toString())
      .replace(/%YY%/g, now.getFullYear().toString().substring(2))
      .replace(/%MM%/g, (now.getMonth() + 1).toString().padStart(2, '0'))
      .replace(/%DD%/g, now.getDate().toString().padStart(2, '0'));

    const num = config.numeroDebut || '1';
    const formattedNum = num.padStart(num.length, '0');

    return config.automatique !== false ? (preview + formattedNum) : (preview + '...');
  }

  save(): void {
    this.saving = true;
    this.parametreService.updateNumerotationConfigs(this.configs).subscribe({
      next: (data) => {
        this.parametre = data;
        this.configs = data.numerotationConfigs;
        this.initialConfigs = JSON.stringify(this.configs);
        this.saving = false;
        this.showNotification('Configurations enregistrées avec succès', 'success');
      },
      error: (err) => {
        console.error('Error saving configs', err);
        this.saving = false;
        this.showNotification('Erreur lors de l\'enregistrement', 'alert');
      }
    });
  }

  private showNotification(message: string, type: 'success' | 'alert'): void {
    this.notification = { message, type };
    setTimeout(() => this.notification = null, 3000);
  }

  toggleMenu(config: NumerotationConfig, event: Event): void {
    event.stopPropagation();
    const currentState = config.showMenu;
    this.configs.forEach((c) => c.showMenu = false);
    config.showMenu = !currentState;
  }

  insertPlaceholder(config: NumerotationConfig, placeholder: string): void {
    config.prefix = (config.prefix || '') + placeholder;
    config.showMenu = false;
  }

  isDirty(): boolean {
    return this.initialConfigs !== JSON.stringify(this.configs);
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.isDirty()) {
      return true;
    }
    this.showConfirmDialog = true;
    return this.deactivateSubject.asObservable();
  }

  onConfirmDeactivate(): void {
    this.showConfirmDialog = false;
    this.deactivateSubject.next(false); // Rester ici
  }

  onCancelDeactivate(): void {
    this.showConfirmDialog = false;
    this.deactivateSubject.next(true); // Quitter
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any) {
    if (this.isDirty()) {
      $event.returnValue = true;
    }
  }
}
