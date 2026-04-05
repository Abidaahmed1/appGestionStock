export enum TypeInventaire {
    TOTAL = 'TOTAL',
    PARTIEL_CATEGORIE = 'PARTIEL_CATEGORIE',
    PARTIEL_ZONE = 'PARTIEL_ZONE'
}

export interface LigneInventaire {
    id: number;
    dateInventaire?: Date;
    ecart: number | null;
    estValide: boolean;
    stockPhysique: number | null;
    stockTheorique: number;
    piece: any;
    commentaire?: string;
    justification?: string;
    statutLigne?: string; // A_SCANNER, EN_ATTENTE_AUDIT, A_RECOMPTER, VALIDE, REFUSE
    responsableLogistique?: any;
    tentativePrecedente?: number;
    motifRecomptage?: string;
}

export interface Inventaire {
    id?: number;
    date: Date;
    nom: string;
    type: TypeInventaire;
    estValide: boolean;
    lignes: LigneInventaire[];
    createur?: any;
    responsables?: any[];
}
