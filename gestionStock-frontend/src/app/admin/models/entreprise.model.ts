export interface Devise {
    id?: number;
    code: string;
    nom?: string;
    symbole?: string;
}

export interface Pays {
    id?: number;
    code: string;
    nom?: string;
}

export interface Entreprise {
    id?: number;
    nom: string;
    contact?: string;
    adresse?: string;
    telephone?: string;
    email?: string;
    logoUrl?: string;
    codePostal?: string;
    devise?: Devise;
    pays?: Pays;
}
