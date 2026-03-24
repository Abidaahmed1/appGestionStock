import { TypeChamp, Parametre, NumerotationConfig } from '../../shared/models/parametre.model';

export { TypeChamp };
export type { Parametre, NumerotationConfig };

export interface PieceDetachee {
    id?: number;
    designation: string;
    reference: string;
    codeBarre?: string;
    prixVente: number;
    tauxTVA: number;
    seuilMinimum: number;
    seuilMaximum: number;
    quantite?: number;
    archivee: boolean;
    imageUrl?: string;
    description?: string;
    categorie?: Categorie;
    produitsAssocies?: ProduitFini[];
    details?: DetailPiece[];
    variations?: PieceDetachee[];
    historiques?: PieceHistorique[];
    entreprise?: any;
    unite?: Unite;
}

export interface Unite {
    id?: number;
    nom: string;
    abbreviation?: string;
}

export interface DetailPiece {
    id?: number;
    parametre: Parametre;
    parametreNom?: string;
    valeur: string;
}

export interface Categorie {
    id?: number;
    nom: string;
    code?: string;
    description?: string;
    archivee?: boolean;
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
