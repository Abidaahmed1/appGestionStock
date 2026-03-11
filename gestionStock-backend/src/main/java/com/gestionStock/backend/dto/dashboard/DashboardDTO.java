package com.gestionStock.backend.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardDTO {
    private long totalArticles;
    private long lowStockArticles;
    private long outOfStockArticles;
    private long totalUnits;

    private List<StockLevelDTO> stockLevels;
    private List<MovementFlowDTO> movementFlows;
    private List<StockPredictionDTO> predictions;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class StockLevelDTO {
        private String designation;
        private int currentQty;
        private int minQty;
        private Map<String, Object> technicalDetails;
    }

    @Data
    @AllArgsConstructor
    public static class MovementFlowDTO {
        private LocalDate date;
        private long entryQty;
        private long exitQty;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class StockPredictionDTO {
        private Long stockId;
        private Long pieceId;
        private String designation;
        private String reference;
        private String categoryName;
        private int currentQty;
        private int minQty;
        private double dailyConsumptionRate;
        private int daysRemaining;
        private LocalDate estimatedStockoutDate;
        private String predictionMethod;
        private Map<String, Object> technicalDetails;
    }
}
