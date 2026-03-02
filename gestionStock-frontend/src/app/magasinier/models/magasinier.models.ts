export interface PieceDetachee {
    id?: number;
    codeBarre: string;
    designation: string;
    prixVente: number;
    reference: string;
    seuilMinimum: number;
    seuilMaximum: number;
    tauxTVA: number;
    archivee: boolean;
    imageUrl?: string;
    categorie?: Categorie;
    stocks?: Stock[];
    produitsAssocies?: ProduitFini[];
    details?: DetailPiece[];
    entreprise?: any;
    variantDetail?: DetailPiece;
    originalPiece?: PieceDetachee;
}

export interface DetailPiece {
    id?: number;
    attributs: { [key: string]: any };
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

export interface Parametre {
    id?: number;
    champsPersonnalises: ChampPersonnalise[];
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
