package com.gestionStock.backend.entity.Stock;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.entity.user.User;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@jakarta.persistence.Table(name = "inventaire_details")
public class LigneInventaire {

    @OneToMany(mappedBy = "ligneInventaire", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("date DESC")
    @JsonManagedReference
    private List<LigneInventaireHistorique> historique = new ArrayList<>();

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "ligne_inv_seq_v2")
    @SequenceGenerator(name = "ligne_inv_seq_v2", sequenceName = "ligne_inv_seq_v2", allocationSize = 1, initialValue = 2000)
    private Long id;

    private LocalDateTime dateInventaire;
    private Integer ecart;
    private boolean estValide;
    private Integer stockPhysique;
    private Integer stockTheorique;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_ligne", columnDefinition = "VARCHAR(50)")
    private LigneStatut statutLigne = LigneStatut.A_SCANNER;

    private String justification;
    private Integer tentativePrecedente;
    private String motifRecomptage;
    private String commentaire;

    @ManyToOne
    @JoinColumn(name = "responsable_logistique_id")
    private User responsableLogistique;

    @ManyToOne
    @JoinColumn(name = "auditeur_id")
    private User auditeur;

    @ManyToOne
    @JoinColumn(name = "createur_ligne_id")
    private User createurLigne;

    public User getAuditeur() {
        return auditeur;
    }

    public void setAuditeur(User auditeur) {
        this.auditeur = auditeur;
    }

    @JsonIgnoreProperties({ "historiques", "produitsAssocies", "details", "variations" })
    @ManyToOne(cascade = { CascadeType.MERGE })
    @JoinColumn(name = "piece_id", nullable = true)
    private PieceDetachee piece;

    @ManyToOne
    @JoinColumn(name = "inventaire_id", nullable = false)
    @JsonBackReference
    private Inventaire inventaire;

    public Long getId() {
        return id;
    }

    public LocalDateTime getDateInventaire() {
        return dateInventaire;
    }

    public Integer getEcart() {
        return ecart;
    }

    public boolean isEstValide() {
        return estValide;
    }

    public Integer getStockPhysique() {
        return stockPhysique;
    }

    public Integer getStockTheorique() {
        return stockTheorique;
    }

    public LigneStatut getStatutLigne() {
        return statutLigne;
    }

    public String getJustification() {
        return justification;
    }

    public Integer getTentativePrecedente() {
        return tentativePrecedente;
    }

    public String getMotifRecomptage() {
        return motifRecomptage;
    }

    public User getResponsableLogistique() {
        return responsableLogistique;
    }

    public User getCreateurLigne() {
        return createurLigne;
    }

    public PieceDetachee getPiece() {
        return piece;
    }

    public Inventaire getInventaire() {
        return inventaire;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setDateInventaire(LocalDateTime dateInventaire) {
        this.dateInventaire = dateInventaire;
    }

    public void setEcart(Integer ecart) {
        this.ecart = ecart;
    }

    public void setEstValide(boolean estValide) {
        this.estValide = estValide;
    }

    public void setStockPhysique(Integer stockPhysique) {
        this.stockPhysique = stockPhysique;
    }

    public void setStockTheorique(Integer stockTheorique) {
        this.stockTheorique = stockTheorique;
    }

    public void setStatutLigne(LigneStatut statutLigne) {
        this.statutLigne = statutLigne;
    }

    public void setJustification(String justification) {
        this.justification = justification;
    }

    public void setTentativePrecedente(Integer tentativePrecedente) {
        this.tentativePrecedente = tentativePrecedente;
    }

    public void setMotifRecomptage(String motifRecomptage) {
        this.motifRecomptage = motifRecomptage;
    }

    public void setResponsableLogistique(User responsableLogistique) {
        this.responsableLogistique = responsableLogistique;
    }

    public void setCreateurLigne(User createurLigne) {
        this.createurLigne = createurLigne;
    }

    public void setPiece(PieceDetachee piece) {
        this.piece = piece;
    }

    public void setInventaire(Inventaire inventaire) {
        this.inventaire = inventaire;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }

    public List<LigneInventaireHistorique> getHistorique() {
        return historique;
    }

    public void setHistorique(List<LigneInventaireHistorique> historique) {
        this.historique = historique;
    }
}
