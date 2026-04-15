import { Component, OnInit, ViewChild, ElementRef, Inject, PLATFORM_ID, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Devise, Entreprise } from '../../models/entreprise.model';
import { EntrepriseService } from '../../services/entreprise.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PhoneInputComponent } from '../../../shared/components/phone-input/phone-input.component';
import { getCountryCallingCode, CountryCode } from 'libphonenumber-js';

interface CountryItem {
    name: string;
    iso2: string;
    dialCode?: string;
}

@Component({
    selector: 'app-entreprise-details',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, PhoneInputComponent],
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
        ville: '',
        rue: '',
        pays: '',
        devise: undefined
    };

    countries: CountryItem[] = [];
    filteredCountries: CountryItem[] = [];
    showCountryDropdown = false;
    countrySearchQuery = '';

    cities: string[] = [];
    filteredCitiesList: string[] = [];
    showCityDropdown = false;
    citySearchQuery = '';

    countryData: any[] = [];
    loadingCountries = false;
    loadingCities = false;

    isEditing = false;
    loading = true;
    saveError = '';
    logoPreview = '';
    pendingLogoFile: File | null = null;
    devises: Devise[] = [];
    isPhoneValid = true;
    notification: { message: string, type: 'success' | 'error' } | null = null;
    formErrors: { [key: string]: boolean } = {};

    constructor(
        private entrepriseService: EntrepriseService,
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient,
        private cdr: ChangeDetectorRef,
        @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    ngOnInit(): void {
        this.loadMetadata();
        this.loadCountries();
        const id = this.route.snapshot.paramMap.get('id');

        if (id) {
            this.entrepriseService.getEntrepriseById(+id).subscribe({
                next: (data) => {
                    this.entreprise = data;
                    this.loading = false;
                    if (this.entreprise.pays) {
                        this.onCountryChange(false);
                    }
                },
                error: (err) => {
                    console.error('Error fetching entreprise', err);
                    if (err.status === 404) {
                        this.entreprise = {
                            nom: '',
                            contact: '',
                            adresse: '',
                            telephone: '',
                            email: '',
                            logoUrl: '',
                            codePostal: '',
                            ville: '',
                            rue: '',
                            pays: '',
                            devise: undefined
                        };
                        this.isEditing = true;
                    }
                    this.loading = false;
                }
            });
        } else {
            this.isEditing = true;
            this.loading = false;
        }
    }

    loadMetadata(): void {
        this.entrepriseService.getAllDevises().subscribe(data => this.devises = data);
    }

    loadCountries() {
        this.loadingCountries = true;
        this.http.get<any>('https://countriesnow.space/api/v0.1/countries').subscribe({
            next: (res) => {
                if (res && res.data) {
                    this.countryData = res.data;
                    this.countries = res.data.map((item: any) => {
                        let dialCode = '';
                        try {
                            dialCode = '+' + getCountryCallingCode(item.iso2 as CountryCode);
                        } catch (e) {
                            dialCode = '';
                        }
                        return {
                            name: item.country,
                            iso2: item.iso2 ? item.iso2.toLowerCase() : '',
                            dialCode: dialCode
                        };
                    }).sort((a: CountryItem, b: CountryItem) => a.name.localeCompare(b.name));
                    
                    this.filteredCountries = [...this.countries];
                }
                this.loadingCountries = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Erreur lors du chargement des pays:', err);
                this.loadingCountries = false;
                this.cdr.detectChanges();
            }
        });
    }

    @HostListener('document:click', ['$event'])
    handleOutsideClick(event: MouseEvent) {
        this.showCountryDropdown = false;
        this.showCityDropdown = false;
    }

    toggleCountryDropdown(event: MouseEvent) {
        if (!this.isEditing) return;
        event.stopPropagation();
        this.showCountryDropdown = !this.showCountryDropdown;
        this.showCityDropdown = false;
        if (this.showCountryDropdown) {
            this.countrySearchQuery = '';
            this.filteredCountries = [...this.countries];
        }
    }

    filterCountriesDropdown() {
        const q = this.countrySearchQuery.toLowerCase().trim();
        if (!q) {
            this.filteredCountries = this.countries;
            return;
        }
        this.filteredCountries = this.countries.filter(c =>
            c.name.toLowerCase().includes(q)
        );
    }

    selectCountry(c: CountryItem) {
        this.entreprise.pays = c.name;
        this.showCountryDropdown = false;
        
        if (c.dialCode) {
            const currentTel = this.entreprise.telephone || '';
            const strippedCurrent = currentTel.replace(/^\+\d+\s*/, '');
            this.entreprise.telephone = `${c.dialCode} ${strippedCurrent}`;
        }
        
        this.onCountryChange(true);
    }

    toggleCityDropdown(event: MouseEvent) {
        if (!this.isEditing || !this.entreprise.pays || this.loadingCities) return;
        event.stopPropagation();
        this.showCityDropdown = !this.showCityDropdown;
        this.showCountryDropdown = false;
        if (this.showCityDropdown) {
            this.citySearchQuery = '';
            this.filteredCitiesList = [...this.cities];
        }
    }

    filterCitiesDropdown() {
        const q = this.citySearchQuery.toLowerCase().trim();
        if (!q) {
            this.filteredCitiesList = this.cities;
            return;
        }
        this.filteredCitiesList = this.cities.filter(city =>
            city.toLowerCase().includes(q)
        );
    }

    selectCity(city: string) {
        this.entreprise.ville = city;
        this.showCityDropdown = false;
    }

    getSelectedCountryObj(): CountryItem | undefined {
        if (!this.entreprise.pays) return undefined;
        return this.countries.find(c => c.name === this.entreprise.pays);
    }

    onCountryChange(resetCity: boolean = true) {
        if (resetCity) {
            this.entreprise.ville = '';
        }
        this.cities = [];
        this.filteredCitiesList = [];
        this.showCityDropdown = false;
        
        if (this.entreprise.pays) {
            this.loadingCities = true;
            this.http.post<any>('https://countriesnow.space/api/v0.1/countries/cities', {
                country: this.entreprise.pays
            }).subscribe({
                next: (res) => {
                    if (res && res.data) {
                        this.cities = res.data.sort();
                        this.filteredCitiesList = [...this.cities];
                    }
                    this.loadingCities = false;
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    console.error('Erreur chargement villes:', err);
                    this.loadingCities = false;
                    this.cdr.detectChanges();
                }
            });
        }
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
            return `http://localhost:8095${url}`;
        }
        if (url.includes('/remote.php/dav/files/')) {
            const parts = url.split('/');
            const filename = parts[parts.length - 1];
            return `http://localhost:8095/api/images/${filename}`;
        }
        return url;
    }

    get displayLogo(): string {
        return this.getLogoUrl(this.logoPreview || this.entreprise.logoUrl || '');
    }

    validate(): boolean {
        let isValid = true;
        this.formErrors = {};

        if (!this.entreprise.nom || this.entreprise.nom.trim() === '') {
            this.formErrors['nom'] = true;
            isValid = false;
        }
        if (!this.entreprise.telephone || this.entreprise.telephone.trim() === '' || !this.isPhoneValid) {
            this.formErrors['telephone'] = true;
            isValid = false;
        }
        if (!this.entreprise.email || this.entreprise.email.trim() === '') {
            this.formErrors['email'] = true;
            isValid = false;
        }
        if (!this.entreprise.devise) {
            this.formErrors['devise'] = true;
            isValid = false;
        }
        if (!this.entreprise.pays) {
            this.formErrors['pays'] = true;
            isValid = false;
        }
        if (!this.entreprise.ville) {
            this.formErrors['ville'] = true;
            isValid = false;
        }

        return isValid;
    }

    save(): void {
        if (!this.validate()) {
            this.notify('Veuillez remplir correctement tous les champs obligatoires.', 'error');
            return;
        }
        this.saveError = '';

        // Construct the full address string for backward compatibility
        this.entreprise.adresse = `${this.entreprise.rue || ''}, ${this.entreprise.codePostal || ''} ${this.entreprise.ville || ''}, ${this.entreprise.pays || ''}`;

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
                if (this.notification?.message === message) {
                    this.notification = null;
                }
            }, 5000);
        }
    }
}
