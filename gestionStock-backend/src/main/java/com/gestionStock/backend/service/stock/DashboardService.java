package com.gestionStock.backend.service.stock;

import com.gestionStock.backend.dto.dashboard.DashboardDTO;
import com.gestionStock.backend.entity.Stock.LigneMouvement;
import com.gestionStock.backend.entity.Stock.MouvementStock;
import com.gestionStock.backend.entity.Stock.TypeMouvement;
import com.gestionStock.backend.entity.entreprise.Entreprise;
import com.gestionStock.backend.entity.piece.PieceDetachee;
import com.gestionStock.backend.repository.stock.MouvementStockRepository;
import com.gestionStock.backend.repository.piece.PieceDetacheeRepository;
import com.gestionStock.backend.service.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

        private final PieceDetacheeRepository pieceRepo;
        private final MouvementStockRepository mouvementRepo;
        private final UserService userService;

        public DashboardDTO getDashboardMetrics(List<Long> pieceIds) {
                Entreprise entreprise = userService.getCurrentUserEntreprise();
                if (entreprise == null)
                        return new DashboardDTO();

                List<PieceDetachee> allPieces = pieceRepo.findByEntreprise(entreprise).stream()
                                .filter(p -> !p.isArchivee())
                                .collect(Collectors.toList());

                if (pieceIds != null && !pieceIds.isEmpty()) {
                        allPieces = allPieces.stream()
                                        .filter(p -> pieceIds.contains(p.getId()))
                                        .collect(Collectors.toList());
                }

                long totalArticles = allPieces.size();
                long lowStockCount = allPieces.stream()
                                .filter(p -> p.getQuantite() != null && p.getQuantite() <= p.getSeuilMinimum() && p.getQuantite() > 0)
                                .count();
                long outOfStockCount = allPieces.stream().filter(p -> p.getQuantite() == null || p.getQuantite() == 0).count();
                long totalUnits = allPieces.stream().mapToLong(p -> p.getQuantite() != null ? p.getQuantite() : 0).sum();

                List<DashboardDTO.StockLevelDTO> stockLevels = allPieces.stream()
                                .limit(20)
                                .map(p -> {
                                        Map<String, Object> technicalDetails = new HashMap<>();
                                        return new DashboardDTO.StockLevelDTO(
                                                        p.getDesignation(),
                                                        p.getQuantite() != null ? p.getQuantite() : 0,
                                                        p.getSeuilMinimum(),
                                                        technicalDetails);
                                })
                                .collect(Collectors.toMap(s -> s.getDesignation(), s -> s, (s1, s2) -> s1)).values().stream()
                                .collect(Collectors.toList());

                // Movement Flow (Entries vs Exits) - Last 30 days
                LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
                List<MouvementStock> recentMovements = mouvementRepo.findByDateBetweenAndBonEntreprise(thirtyDaysAgo,
                                LocalDateTime.now(), entreprise);

                Map<LocalDate, DashboardDTO.MovementFlowDTO> flowMap = new TreeMap<>();

                for (int i = 0; i < 7; i++) {
                        LocalDate d = LocalDate.now().minusDays(i);
                        flowMap.put(d, new DashboardDTO.MovementFlowDTO(d, 0, 0));
                }

                for (MouvementStock m : recentMovements) {
                        LocalDate date = m.getDate().toLocalDate();
                        DashboardDTO.MovementFlowDTO flow = flowMap.computeIfAbsent(date,
                                        d -> new DashboardDTO.MovementFlowDTO(d, 0, 0));

                        boolean isEntry = (m.getTypeMouvement() == TypeMouvement.ENTREE_RECEPTION
                                        || m.getTypeMouvement() == TypeMouvement.ENTREE_RETOUR);

                        long qty = m.getLigneMouvement().stream()
                                        .filter(l -> l.getPiece() != null)
                                        .filter(l -> (pieceIds != null && !pieceIds.isEmpty())
                                                        ? pieceIds.contains(l.getPiece().getId())
                                                        : !l.getPiece().isArchivee())
                                        .mapToLong(l -> l.getQuantite() != null ? l.getQuantite() : 0).sum();

                        if (isEntry) {
                                flow.setEntryQty(flow.getEntryQty() + qty);
                        } else {
                                flow.setExitQty(flow.getExitQty() + qty);
                        }
                }

                List<DashboardDTO.MovementFlowDTO> movementFlows = flowMap.values().stream()
                                .sorted(Comparator.comparing(DashboardDTO.MovementFlowDTO::getDate))
                                .collect(Collectors.toList());

                List<DashboardDTO.StockPredictionDTO> predictions = calculatePredictions(allPieces, recentMovements);

                return DashboardDTO.builder()
                                .totalArticles(totalArticles)
                                .lowStockArticles(lowStockCount)
                                .outOfStockArticles(outOfStockCount)
                                .totalUnits(totalUnits)
                                .stockLevels(stockLevels)
                                .movementFlows(movementFlows)
                                .predictions(predictions)
                                .build();
        }

        private List<DashboardDTO.StockPredictionDTO> calculatePredictions(List<PieceDetachee> pieces,
                        List<MouvementStock> movements) {
                Map<Long, Double> dailyConso = new HashMap<>();

                for (MouvementStock m : movements) {
                        boolean isExit = (m.getTypeMouvement() == TypeMouvement.SORTIE_VENTE ||
                                        m.getTypeMouvement() == TypeMouvement.SORTIE_PERTE ||
                                        m.getTypeMouvement() == TypeMouvement.SORTIE_MAINTENANCE ||
                                        m.getTypeMouvement() == TypeMouvement.SORTIE_RETOUR);

                        if (isExit) {
                                for (LigneMouvement ligne : m.getLigneMouvement()) {
                                        if (ligne.getPiece() != null) {
                                                Long pieceId = ligne.getPiece().getId();
                                                int qty = ligne.getQuantite() != null ? ligne.getQuantite() : 0;
                                                dailyConso.put(pieceId,
                                                                dailyConso.getOrDefault(pieceId, 0.0)
                                                                                + (double) qty / 30.0);
                                        }
                                }
                        }
                }

                return pieces.stream()
                                .map(p -> {
                                        double rate = dailyConso.getOrDefault(p.getId(), 0.0);
                                        int daysRemaining = 999;
                                        LocalDate target = null;
                                        int qte = p.getQuantite() != null ? p.getQuantite() : 0;
                                        if (rate > 0) {
                                                daysRemaining = (int) (qte / rate);
                                                target = LocalDate.now().plusDays(daysRemaining);
                                        }

                                        return DashboardDTO.StockPredictionDTO.builder()
                                                        .stockId(p.getId())
                                                        .pieceId(p.getId())
                                                        .designation(p.getDesignation())
                                                        .reference(p.getReference())
                                                        .categoryName(p.getCategorie() != null
                                                                        ? p.getCategorie().getNom()
                                                                        : "N/A")
                                                        .currentQty(qte)
                                                        .minQty(p.getSeuilMinimum())
                                                        .dailyConsumptionRate(rate)
                                                        .daysRemaining(daysRemaining)
                                                        .estimatedStockoutDate(target)
                                                        .predictionMethod("Moyenne ")
                                                        .build();
                                })
                                .filter(Objects::nonNull)
                                .sorted(Comparator.comparingInt(DashboardDTO.StockPredictionDTO::getDaysRemaining))
                                .collect(Collectors.toList());
        }
}
