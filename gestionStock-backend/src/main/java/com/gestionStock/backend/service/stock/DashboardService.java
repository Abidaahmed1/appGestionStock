package com.gestionStock.backend.service.stock;

import com.gestionStock.backend.dto.dashboard.DashboardDTO;
import com.gestionStock.backend.entity.Stock.LigneMouvement;
import com.gestionStock.backend.entity.Stock.MouvementStock;
import com.gestionStock.backend.entity.Stock.Stock;
import com.gestionStock.backend.entity.Stock.TypeMouvement;
import com.gestionStock.backend.entity.entreprise.Entreprise;
import com.gestionStock.backend.repository.stock.MouvementStockRepository;
import com.gestionStock.backend.repository.stock.StockRepository;
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

        private final StockRepository stockRepo;
        private final MouvementStockRepository mouvementRepo;
        private final UserService userService;

        public DashboardDTO getDashboardMetrics(List<Long> pieceIds) {
                Entreprise entreprise = userService.getCurrentUserEntreprise();
                if (entreprise == null)
                        return new DashboardDTO();

                List<Stock> allStock = stockRepo.findByPieceEntreprise(entreprise).stream()
                                .filter(s -> !s.getPiece().isArchivee())
                                .collect(Collectors.toList());

                if (pieceIds != null && !pieceIds.isEmpty()) {
                        allStock = allStock.stream()
                                        .filter(s -> pieceIds.contains(s.getPiece().getId()))
                                        .collect(Collectors.toList());
                }

                long totalArticles = allStock.size();
                long lowStockCount = allStock.stream()
                                .filter(s -> s.getQuantite() <= s.getPiece().getSeuilMinimum() && s.getQuantite() > 0)
                                .count();
                long outOfStockCount = allStock.stream().filter(s -> s.getQuantite() == 0).count();
                long totalUnits = allStock.stream().mapToLong(Stock::getQuantite).sum();

                // Stock levels for charts (Top 20)
                List<DashboardDTO.StockLevelDTO> stockLevels = allStock.stream()
                                .limit(20)
                                .map(s -> new DashboardDTO.StockLevelDTO(
                                                s.getPiece().getDesignation(),
                                                s.getQuantite(),
                                                s.getPiece().getSeuilMinimum(),
                                                s.getDetailPiece() != null ? s.getDetailPiece().getAttributs()
                                                                : new HashMap<>()))
                                .collect(Collectors.toList());

                // Movement Flow (Entries vs Exits) - Last 30 days
                LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
                List<MouvementStock> recentMovements = mouvementRepo.findByDateBetweenAndBonEntreprise(thirtyDaysAgo,
                                LocalDateTime.now(), entreprise);

                Map<LocalDate, DashboardDTO.MovementFlowDTO> flowMap = new TreeMap<>();

                // Initialize last 7 days at least to avoid empty charts
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
                                        .filter(l -> l.getStock() != null && l.getStock().getPiece() != null)
                                        .filter(l -> (pieceIds != null && !pieceIds.isEmpty())
                                                        ? pieceIds.contains(l.getStock().getPiece().getId())
                                                        : !l.getStock().getPiece().isArchivee())
                                        .mapToLong(LigneMouvement::getQuantite).sum();

                        if (isEntry) {
                                flow.setEntryQty(flow.getEntryQty() + qty);
                        } else {
                                flow.setExitQty(flow.getExitQty() + qty);
                        }
                }

                List<DashboardDTO.MovementFlowDTO> movementFlows = flowMap.values().stream()
                                .sorted(Comparator.comparing(DashboardDTO.MovementFlowDTO::getDate))
                                .collect(Collectors.toList());

                // Prediction Logic
                List<DashboardDTO.StockPredictionDTO> predictions = calculatePredictions(allStock, recentMovements);

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

        private List<DashboardDTO.StockPredictionDTO> calculatePredictions(List<Stock> stocks,
                        List<MouvementStock> movements) {
                Map<Long, Double> dailyConso = new HashMap<>();

                // Group exits by pieceId
                for (MouvementStock m : movements) {
                        boolean isExit = (m.getTypeMouvement() == TypeMouvement.SORTIE_VENTE ||
                                        m.getTypeMouvement() == TypeMouvement.SORTIE_PERTE ||
                                        m.getTypeMouvement() == TypeMouvement.SORTIE_MAINTENANCE ||
                                        m.getTypeMouvement() == TypeMouvement.SORTIE_RETOUR);

                        if (isExit) {
                                for (LigneMouvement ligne : m.getLigneMouvement()) {
                                        if (ligne.getStock() != null) {
                                                Long stockId = ligne.getStock().getId();
                                                dailyConso.put(stockId,
                                                                dailyConso.getOrDefault(stockId, 0.0)
                                                                                + (double) ligne.getQuantite() / 30.0);
                                        }
                                }
                        }
                }

                return stocks.stream()
                                .map(s -> {
                                        double rate = dailyConso.getOrDefault(s.getId(), 0.0);
                                        int daysRemaining = 999;
                                        LocalDate target = null;
                                        if (rate > 0) {
                                                daysRemaining = (int) (s.getQuantite() / rate);
                                                target = LocalDate.now().plusDays(daysRemaining);
                                        }

                                        return DashboardDTO.StockPredictionDTO.builder()
                                                        .stockId(s.getId())
                                                        .pieceId(s.getPiece().getId())
                                                        .designation(s.getPiece().getDesignation())
                                                        .reference(s.getPiece().getReference())
                                                        .categoryName(s.getPiece().getCategorie() != null
                                                                        ? s.getPiece().getCategorie().getNom()
                                                                        : "N/A")
                                                        .currentQty(s.getQuantite())
                                                        .minQty(s.getPiece().getSeuilMinimum())
                                                        .dailyConsumptionRate(rate)
                                                        .daysRemaining(daysRemaining)
                                                        .estimatedStockoutDate(target)
                                                        .predictionMethod("Moyenne ")
                                                        .technicalDetails(s.getDetailPiece() != null
                                                                        ? s.getDetailPiece().getAttributs()
                                                                        : new HashMap<>())
                                                        .build();
                                })
                                .filter(Objects::nonNull)
                                .sorted(Comparator.comparingInt(DashboardDTO.StockPredictionDTO::getDaysRemaining))
                                .collect(Collectors.toList());
        }
}
