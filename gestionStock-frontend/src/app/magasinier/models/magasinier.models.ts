export interface PieceDetachee {
    id?: number;
    designation: string;
    prixVente: number;
    reference: string;
    seuilMinimum: number;
    seuilMaximum: number;
    tauxTVA: number;
    archivee: boolean;
    imageUrl?: string;
    description?: string;
    categorie?: Categorie;
    stocks?: Stock[];
    produitsAssocies?: ProduitFini[];
    details?: DetailPiece[];
    historiques?: PieceHistorique[];
    entreprise?: any;
    variantDetail?: DetailPiece;
    originalPiece?: PieceDetachee;
    unite?: Unite;
}

export interface Unite {
    id?: number;
    nom: string;
    abbreviation?: string;
}

export interface DetailPiece {
    id?: number;
    attributs: { [key: string]: any };
    codeBarre?: string;
    prixVente?: number;
    tauxTVA?: number;
    stock?: Stock;
}

export interface ChampPersonnalise {
    nom: string;
    type: string;
    obligatoire: boolean;
    variante: boolean;
    options: string[];
    defaultValue?: string;
    description?: string;
    ordre: number;
    actif: boolean;
    _showAddInput?: boolean;
}

export interface NumerotationConfig {
    module: string;
    prefix: string;
    numeroDebut: string;
    redemarrer: string;
    automatique?: boolean;
    actif: boolean;
}

export interface Parametre {
    id?: number;
    champsPersonnalises: ChampPersonnalise[];
    numerotationConfigs: NumerotationConfig[];
}

export interface Categorie {
    id?: number;
    nom: string;
    code?: string;
    description?: string;
}

export interface Stock {
    id?: number;
    quantite: number;
    type: string;
}

export interface ProduitFini {
    id?: number;
    code: string;
    designation: string;
    imageUrl?: string;
    pieces?: PieceDetachee[];
    estArchivee?: boolean;
}

export interface PieceHistorique {
    id?: number;
    date: Date;
    action: string;
    details: string;
    utilisateur?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}
