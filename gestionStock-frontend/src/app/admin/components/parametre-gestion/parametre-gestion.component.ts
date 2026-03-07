import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParametreService, Parametre, ChampPersonnalise, TypeChamp } from '../../services/parametre.service';

@Component({
    selector: 'app-parametre-gestion',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './parametre-gestion.component.html',
    styleUrls: ['./parametre-gestion.component.css']
})
export class ParametreGestionComponent implements OnInit {
    parametre?: Parametre;
    typesChamps: TypeChamp[] = [];

    showModal = false;
    isEditing = false;
    currentChamp: ChampPersonnalise = this.getEmptyChamp();
    oldNom = '';

    constructor(private parametreService: ParametreService) { }

    ngOnInit(): void {
        this.loadParametres(1);
        this.loadTypes();
    }

    loadParametres(entrepriseId: number): void {
        this.parametreService.getParametreByEntreprise(entrepriseId).subscribe({
            next: (data) => this.parametre = data,
            error: (err) => console.error('Error loading parameters', err)
        });
    }

    loadTypes(): void {
        this.parametreService.getTypesChamps().subscribe(types => this.typesChamps = types);
    }

    getEmptyChamp(): ChampPersonnalise {
        return {
            nom: '',
            type: TypeChamp.TEXT,
            obligatoire: false,
            variante: false,
            options: [],
            ordre: 0,
            actif: true,
            description: ''
        };
    }

    openAddModal(): void {
        this.isEditing = false;
        this.currentChamp = this.getEmptyChamp();
        this.showModal = true;
    }

    openEditModal(champ: ChampPersonnalise): void {
        this.isEditing = true;
        this.currentChamp = { ...champ, options: [...champ.options] };
        this.oldNom = champ.nom;
        this.showModal = true;
    }

    closeModal(): void {
        this.showModal = false;
    }

    saveChamp(): void {
        if (!this.parametre?.id) return;

        if (this.isEditing) {
            this.parametreService.modifierChamp(this.parametre.id, this.oldNom, this.currentChamp).subscribe({
                next: (data) => {
                    this.parametre = data;
                    this.closeModal();
                }
            });
        } else {
            this.parametreService.ajouterChamp(this.parametre.id, this.currentChamp).subscribe({
                next: (data) => {
                    this.parametre = data;
                    this.closeModal();
                }
            });
        }
    }

    deleteChamp(nom: string): void {
        if (!this.parametre?.id || !confirm(`Supprimer le champ "${nom}" ?`)) return;

        this.parametreService.supprimerChamp(this.parametre.id, nom).subscribe({
            next: (data) => this.parametre = data
        });
    }

    addOption(): void {
        this.currentChamp.options.push('');
    }

    removeOption(index: number): void {
        this.currentChamp.options.splice(index, 1);
    }

    trackByIndex(index: number, obj: any): any {
        return index;
    }
}
