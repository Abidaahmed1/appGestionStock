import { Component, OnInit, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Devise, Entreprise, Pays } from '../../models/entreprise.model';
import { EntrepriseService } from '../../services/entreprise.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
    selector: 'app-entreprise-details',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './entreprise-details.component.html',
    styleUrls: ['./entreprise-details.component.css']
})
export class EntrepriseDetailsComponent implements OnInit {

    @ViewChild('logoInput') logoInput!: ElementRef<HTMLInputElement>;

    entreprise: Entreprise = {
        nom: '',
        contact: '',
        adresse: '',
        telephone: '',
        email: '',
        logoUrl: '',
        codePostal: '',
        devise: undefined,
        pays: undefined
    };

    isEditing = false;
    loading = true;
    saveError = '';
    logoPreview = '';
    pendingLogoFile: File | null = null;
    countries: Pays[] = [];
    devises: Devise[] = [];
    notification: { message: string, type: 'success' | 'error' } | null = null;

    constructor(
        private entrepriseService: EntrepriseService,
        private route: ActivatedRoute,
        private router: Router,
        @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    ngOnInit(): void {
        this.loadMetadata();
        const id = this.route.snapshot.paramMap.get('id');

        if (id) {
            this.entrepriseService.getEntrepriseById(+id).subscribe({
                next: (data) => {
                    this.entreprise = data;
                    this.loading = false;
                },
                error: (err) => {
                    console.error('Error fetching entreprise', err);
                    // Si l'entreprise n'existe pas (404), on repasse en mode création
                    if (err.status === 404) {
                        this.entreprise = {
                            nom: '',
                            contact: '',
                            adresse: '',
                            telephone: '',
                            email: '',
                            logoUrl: '',
                            codePostal: '',
                            devise: undefined,
                            pays: undefined
                        };
                        this.isEditing = true;
                    }
                    this.loading = false;
                }
            });
        } else {
            // Pas d'ID dans l'URL : on est en mode création.
            // L'interface doit rester vide et être remplie par l'administrateur.
            this.isEditing = true;
            this.loading = false;
        }
    }

    loadMetadata(): void {
        this.entrepriseService.getAllPays().subscribe(data => this.countries = data);
        this.entrepriseService.getAllDevises().subscribe(data => this.devises = data);
    }

    compareObjects(o1: any, o2: any): boolean {
        return o1 && o2 ? o1.id === o2.id : o1 === o2;
    }

    toggleEdit(): void {
        this.isEditing = !this.isEditing;
        this.saveError = '';
        if (!this.isEditing) {
            if (this.logoPreview) {
                URL.revokeObjectURL(this.logoPreview);
                this.logoPreview = '';
            }
            this.pendingLogoFile = null;
        }
    }

    triggerLogoUpload(): void {
        if (this.isEditing && isPlatformBrowser(this.platformId)) {
            this.logoInput?.nativeElement?.click();
        }
    }


    onLogoChange(event: Event): void {
        if (!isPlatformBrowser(this.platformId)) return;
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = () => {
            this.logoPreview = reader.result as string;
        };
        reader.readAsDataURL(file);

        if (this.entreprise.id) {
            this.entrepriseService.uploadLogo(this.entreprise.id, file).subscribe({
                next: (updated) => {
                    this.entreprise.logoUrl = updated.logoUrl;
                    this.logoPreview = '';
                },
                error: (err) => {
                    console.error('Error uploading logo', err);
                }
            });
        } else {
            this.pendingLogoFile = file;
        }
    }

    goBack(): void {
        this.router.navigate(['/admin/settings']);
    }

    onLogoError(): void {
        this.entreprise.logoUrl = '';
    }

    getLogoUrl(url: string): string {
        if (!url) return '';
        if (url.startsWith('data:image/')) return url;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        if (url.startsWith('/api/images') || url.startsWith('/uploads')) {
            return `http://localhost:8081${url}`;
        }
        if (url.includes('/remote.php/dav/files/')) {
            const parts = url.split('/');
            const filename = parts[parts.length - 1];
            return `http://localhost:8081/api/images/${filename}`;
        }
        return url;
    }

    get displayLogo(): string {
        return this.getLogoUrl(this.logoPreview || this.entreprise.logoUrl || '');
    }

    save(): void {
        this.saveError = '';
        if (this.entreprise.id) {
            this.entrepriseService.updateEntreprise(this.entreprise.id, this.entreprise).subscribe({
                next: (updated) => {
                    this.entreprise = updated;
                    this.isEditing = false;
                    this.notify('Configuration enregistrée avec succès !', 'success');
                },
                error: (err) => {
                    console.error('Error updating', err);
                    const detail = err?.error?.details?.cause || '';
                    this.saveError = err?.error?.message || 'Erreur lors de la sauvegarde.';
                    if (detail) this.saveError += ' (' + detail + ')';
                    this.notify('Erreur lors de la sauvegarde.', 'error');
                }
            });
        } else {
            this.entrepriseService.createEntreprise(this.entreprise).subscribe({
                next: (created) => {
                    this.entreprise = created;
                    this.isEditing = false;
                    this.notify('Société créée avec succès !', 'success');
                    // If a logo was selected before saving, upload it now
                    if (this.pendingLogoFile && created.id) {
                        this.entrepriseService.uploadLogo(created.id, this.pendingLogoFile).subscribe({
                            next: (updated) => {
                                this.entreprise.logoUrl = updated.logoUrl;
                                this.logoPreview = '';
                                this.pendingLogoFile = null;
                            },
                            error: (err) => console.error('Error uploading logo after create', err)
                        });
                    }
                },
                error: (err) => {
                    console.error('Error creating', err);
                    this.saveError = err?.error?.message || 'Erreur lors de la création.';
                    this.notify('Erreur lors de la création.', 'error');
                }
            });
        }
    }

    notify(message: string, type: 'success' | 'error'): void {
        this.notification = { message, type };
        if (isPlatformBrowser(this.platformId)) {
            setTimeout(() => {
                this.notification = null;
            }, 5000);
        }
    }
}
