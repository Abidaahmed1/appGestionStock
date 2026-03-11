package com.gestionStock.backend.controller.stock;

import com.gestionStock.backend.dto.dashboard.DashboardDTO;
import com.gestionStock.backend.service.stock.DashboardService;
import lombok.RequiredArgsConstructor;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/metrics")
    public DashboardDTO getMetrics(
            @org.springframework.web.bind.annotation.RequestParam(required = false) List<Long> pieceIds) {
        return dashboardService.getDashboardMetrics(pieceIds);
    }
}
