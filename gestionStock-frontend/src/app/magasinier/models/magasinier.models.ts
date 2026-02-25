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
    stock?: Stock;
    produitsAssocies?: ProduitFini[];
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
