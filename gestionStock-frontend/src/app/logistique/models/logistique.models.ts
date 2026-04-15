
export interface Fournisseur {
    id?: number;
    code: string;
    nom: string;
    adresse?: string;
    rue?: string;
    ville?: string;
    codePostal?: string;
    pays?: string;
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
    SORTIE_RETOUR = 'SORTIE_RETOUR',
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
    numeroBon: string;
    date: string;
    typeBon: TypeBon;
    bonOrigine?: Bon;
    fournisseur?: Fournisseur;
    createur?: any;
    mouvement?: MouvementStock;
    archived?: boolean;
}

export interface Stock {
    id?: number;
    piece: any;
    quantite: number;
    type?: string;
    detailPiece?: any;
    reference?: string;
}

export interface LigneMouvement {
    id?: number;
    piece: any;
    detailPiece?: any;
    quantite: number;
    prixHTVA: number;
    tauxTVA: number;
}

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
    numeroCmd: string;
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
    detailPiece?: any;
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
    nbJoursLivraison: number;
    estPrincipale: boolean;
    dateDebutValidite?: string;
    dateFinValidite?: string;
    piece: any;
    fournisseur: Fournisseur;
}

export interface StockLevelDTO {
    designation: string;
    currentQty: number;
    minQty: number;
    technicalDetails?: { [key: string]: any };
}

export interface MovementFlowDTO {
    date: string;
    entryQty: number;
    exitQty: number;
}

export interface StockPredictionDTO {
    stockId: number;
    pieceId: number;
    designation: string;
    reference: string;
    categoryName: string;
    currentQty: number;
    minQty: number;
    dailyConsumptionRate: number;
    daysRemaining: number;
    estimatedStockoutDate: string;
    predictionMethod?: string;
    technicalDetails?: { [key: string]: any };
}

export interface DashboardDTO {
    totalArticles: number;
    lowStockArticles: number;
    outOfStockArticles: number;
    totalUnits: number;
    stockLevels: StockLevelDTO[];
    movementFlows: MovementFlowDTO[];
    predictions: StockPredictionDTO[];
}
