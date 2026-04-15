import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    getCountries,
    getCountryCallingCode,
    CountryCode,
    parsePhoneNumberFromString,
    isValidPhoneNumber
} from 'libphonenumber-js';

export interface CountryPhoneData {
    name: string;
    dialCode: string;
    code: CountryCode;
    iso: string;
}

@Component({
    selector: 'app-phone-input',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './phone-input.component.html',
    styleUrls: ['./phone-input.component.css']
})
export class PhoneInputComponent implements OnInit, OnChanges {
    // --- Inputs & Outputs ---
    @Input() phoneNumber: string | undefined = ''; // Full number including dial code
    @Input() isEditing: boolean = false;
    @Input() placeholderNumber: string = 'Numéro de téléphone';
    @Input() placeholderSearch: string = 'Rechercher un pays ou un code...';
    @Input() hideSelector: boolean = false;

    @Output() phoneNumberChange = new EventEmitter<string>();
    @Output() isValid = new EventEmitter<boolean>();

    // --- Internal State ---
    selectedCountry: CountryPhoneData | undefined;
    localNumber: string = ''; // Number part without dial code
    allCountries: CountryPhoneData[] = [];
    filteredCountries: CountryPhoneData[] = [];
    showDropdown: boolean = false;
    searchQuery: string = '';
    errorMsg: string = '';

    constructor() {
        this.initCountries();
    }

    ngOnInit(): void {
        this.parseFullNumber();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['phoneNumber'] && !changes['phoneNumber'].firstChange) {
            this.parseFullNumber();
        }
    }

    private initCountries(): void {
        const regionNames = new Intl.DisplayNames(['fr'], { type: 'region' });
        let codes = getCountries();

        // Filter out Israel as requested
        codes = codes.filter(code => code !== 'IL');

        this.allCountries = codes.map(code => {
            let name = '';
            try {
                name = regionNames.of(code) || code;
            } catch (e) {
                name = code;
            }

            return {
                name: name,
                dialCode: '+' + getCountryCallingCode(code),
                code: code as CountryCode,
                iso: code.toLowerCase()
            };
        });

        // Move Tunisia, France and common ones to top, then alphabetical
        const priority = ['TN', 'FR', 'DZ', 'MA', 'BE', 'CH', 'CA'];
        this.allCountries.sort((a, b) => {
            const idxA = priority.indexOf(a.code);
            const idxB = priority.indexOf(b.code);

            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;

            return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
        });

        this.filteredCountries = this.allCountries;
    }

    @HostListener('document:click', ['$event'])
    handleOutsideClick(event: MouseEvent) {
        this.showDropdown = false;
    }

    toggleDropdown(event: MouseEvent): void {
        event.stopPropagation();
        this.showDropdown = !this.showDropdown;
        if (this.showDropdown) {
            this.searchQuery = '';
            this.filteredCountries = this.allCountries;
        }
    }

    filterCountries(): void {
        const q = this.searchQuery.toLowerCase().trim();
        if (!q) {
            this.filteredCountries = this.allCountries;
            return;
        }

        this.filteredCountries = this.allCountries.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.dialCode.includes(q) ||
            c.code.toLowerCase().includes(q)
        );
    }

    onSelectCountry(country: CountryPhoneData): void {
        this.selectedCountry = country;
        this.showDropdown = false;
        this.updateFullNumber();
        this.validate();
    }

    private parseFullNumber(): void {
        const rawVal = this.phoneNumber || '';
        if (!rawVal) {
            if (!this.selectedCountry) {
                this.selectedCountry = this.allCountries.find(c => c.code === 'TN');
            }
            this.localNumber = '';
            return;
        }

        const parsed = parsePhoneNumberFromString(rawVal);
        if (parsed && parsed.country) {
            this.selectedCountry = this.allCountries.find(c => c.code === parsed.country);
            this.localNumber = parsed.nationalNumber;
        } else {
            const sorted = [...this.allCountries].sort((a, b) => b.dialCode.length - a.dialCode.length);
            for (const c of sorted) {
                if (rawVal.startsWith(c.dialCode)) {
                    this.selectedCountry = c;
                    this.localNumber = rawVal.substring(c.dialCode.length).trim();
                    break;
                }
            }
            if (!this.selectedCountry) {
                this.selectedCountry = this.allCountries.find(c => c.code === 'TN');
                this.localNumber = rawVal;
            }
        }
        this.validate();
    }

    onNumberInput(): void {
        this.localNumber = this.localNumber.replace(/[^\d\s\.-]/g, '');
        this.updateFullNumber();
        this.validate();
    }

    private updateFullNumber(): void {
        const dial = this.selectedCountry?.dialCode || '';
        const clean = this.localNumber.trim();
        const full = clean ? `${dial} ${clean}` : '';
        this.phoneNumberChange.emit(full);
    }

    private validate(): void {
        this.errorMsg = '';
        const cleanNumber = this.localNumber.trim().replace(/\s/g, '');

        if (!cleanNumber) {
            this.isValid.emit(true);
            return;
        }

        try {
            const dial = this.selectedCountry?.dialCode || '';
            const full = `${dial}${cleanNumber}`;

            const phoneNumberObj = parsePhoneNumberFromString(full, this.selectedCountry?.code);
            const type = phoneNumberObj?.getType();
            let valid = !!phoneNumberObj && phoneNumberObj.isValid();

            console.log(`Validating [${this.selectedCountry?.name}]: ${full} -> Valid: ${valid}, Type: ${type || 'INCONNU'}`);

            if (!valid) {
                const possible = phoneNumberObj ? phoneNumberObj.isPossible() : false;

                if (cleanNumber.length >= 4) {
                    if (!possible) {
                        this.errorMsg = `Format impossible pour la ${this.selectedCountry?.name}.`;
                    } else {
                        this.errorMsg = `Numéro invalide ou non reconnu pour la ${this.selectedCountry?.name}.`;
                    }
                }
                this.isValid.emit(false);
            } else {
                this.isValid.emit(true);
            }
        } catch (e) {
            this.isValid.emit(false);
        }
    }
}
