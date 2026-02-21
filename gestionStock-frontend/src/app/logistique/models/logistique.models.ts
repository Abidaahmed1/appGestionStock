
export interface Fournisseur {
    id?: number;
    code: string;
    nom: string;
    adresse: string;
    email: string;
    tel: string;
    archivee?: boolean;
}

export enum TypeBon {
    SORTIE = 'SORTIE',
    RETOUR = 'RETOUR',
    ENTREE = 'ENTREE'
}

export enum TypeMouvement {
    SORTIE_VENTE = 'SORTIE_VENTE',
    SORTIE_PERTE = 'SORTIE_PERTE',
    SORTIE_MAINTENANCE = 'SORTIE_MAINTENANCE',
    ENTREE_RETOUR = 'ENTREE_RETOUR',
    ENTREE_RECEPTION = 'ENTREE_RECEPTION'
}

export enum TypeStock {
    DISPONIBLE = 'DISPONIBLE',
    RESERVE = 'RESERVE',
    EN_REAPPROVISIONNEMENT = 'EN_REAPPROVISIONNEMENT',
    DEFECTUEUX = 'DEFECTUEUX'
}

export interface Bon {
    id?: number;
    numeroBon: number;
    date: string;
    typeBon: TypeBon;
    fournisseur?: Fournisseur;
    createur?: any;
}

export interface Stock {
    id?: number;
    piece: any;
    quantite: number;
    type: TypeStock;
}

export interface LigneMouvement {
    id?: number;
    stock: Stock;
    quantite: number;
    prixHTVA: number;
    tauxTVA: number;
}

/** Statuts de commande fournisseur : EN_ATTENTE, RECUE, ANNULEE uniquement. */
export enum StatutCommande {
    EN_ATTENTE = 'EN_ATTENTE',
    RECUE = 'RECUE',
    ANNULEE = 'ANNULEE'
}

export interface MouvementStock {
    id?: number;
    date: string;
    montantHTVA: number;
    montantTTC: number;
    typeMouvement: TypeMouvement;
    ligneMouvement: LigneMouvement[];
    bon?: Bon;
}

export interface BonCommandeFournisseur {
    id?: number;
    numeroCmd: number;
    dateCmd: string;
    fournisseur?: Fournisseur;
    statut: StatutCommande;
    dateArrivee?: string;
    createur?: any;
    lignes?: LigneCommande[];
}

export interface LigneCommande {
    id?: number;
    piece: any;
    qteCmd: number;
    prixAchat: number;
    taxe?: number;
    remise?: number;
}

export interface PieceFournisseur {
    id?: number;
    prixAchat: number;
    qteMinACommander: number;
    tauxRemise: number;
    estPrincipale: boolean;
    dateDebutValidite?: string;
    dateFinValidite?: string;
    piece: any;
    fournisseur: Fournisseur;
}
