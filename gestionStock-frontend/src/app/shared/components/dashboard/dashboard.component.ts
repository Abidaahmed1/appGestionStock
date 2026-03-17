import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DashboardService } from '../../../logistique/services/dashboard.service';
import { DashboardDTO } from '../../../logistique/models/logistique.models';
import { NgApexchartsModule, ChartComponent } from "ng-apexcharts";
import { MagasinierService } from "../../../magasinier/services/magasinier.service";
import { FormsModule } from "@angular/forms";
import { EntrepriseService } from '../../../admin/services/entreprise.service';
import { Entreprise } from '../../../admin/models/entreprise.model';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexStroke,
  ApexYAxis,
  ApexTitleSubtitle,
  ApexFill,
  ApexLegend
} from "ng-apexcharts";

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  yaxis: ApexYAxis;
  fill: ApexFill;
  legend: ApexLegend;
  colors: string[];
  title: ApexTitleSubtitle;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  metrics?: DashboardDTO;
  loading = true;
  entreprise: Entreprise | null = null;
  pieces: any[] = [];
  selectedPieceIds: (string | number)[] = [];
  searchTerm: string = '';
  showDropdown = false;
  get selectedPieceName(): string {
    if (this.selectedPieceIds.length === 0) return 'Toutes les pièces (Global)';
    if (this.selectedPieceIds.length === 1) {
      const p = this.pieces.find(p => p.id == this.selectedPieceIds[0]);
      return p ? `${p.designation}` : '1 pièce sélectionnée';
    }
    return `${this.selectedPieceIds.length} pièces sélectionnées`;
  }

  get filteredPieces() {
    if (!this.searchTerm) return this.pieces;
    const term = this.searchTerm.toLowerCase();
    return this.pieces.filter(p =>
      p.designation.toLowerCase().includes(term) ||
      p.reference.toLowerCase().includes(term)
    );
  }

  public stockChartOptions: Partial<ChartOptions> | any;
  public flowChartOptions: Partial<ChartOptions> | any;

  constructor(
    private dashboardService: DashboardService,
    private pieceService: MagasinierService,
    private entrepriseService: EntrepriseService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadPieces();
      this.loadMetrics();
      this.loadEntreprise();
    }
  }

  loadPieces() {
    this.pieceService.getPieces().subscribe({
      next: (data) => this.pieces = data,
      error: (err) => console.error('Error loading pieces', err)
    });
  }

  loadEntreprise() {
      // Écoute de l'entreprise courante pour les mises à jour en direct
      this.entrepriseService.currentEntreprise$.subscribe((data: Entreprise | null) => {
          if (data) {
              this.entreprise = data;
          }
      });

      // Lancement du chargement initial s'il n'est pas déjà fait
      this.entrepriseService.getCurrentEntreprise().subscribe({
          error: () => {
              this.entrepriseService.getAllEntreprises().subscribe({
                  next: (list: Entreprise[]) => {
                      if (list && list.length > 0) {
                          this.entreprise = list[0];
                      }
                  }
              });
          }
      });
  }

  loadMetrics() {
    this.loading = true;
    this.dashboardService.getMetrics(this.selectedPieceIds).subscribe({
      next: (data) => {
        this.metrics = data;
        this.initCharts();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard metrics', err);
        this.loading = false;
      }
    });
  }

  initCharts() {
    if (!this.metrics) return;

    // Stock Levels Chart
    this.stockChartOptions = {
      series: [
        {
          name: "Stock Actuel",
          data: this.metrics.stockLevels.map(s => s.currentQty)
        },
        {
          name: "Seuil Minimum",
          data: this.metrics.stockLevels.map(s => s.minQty)
        }
      ],
      chart: {
        type: "bar",
        height: 350,
        fontFamily: 'Inter, sans-serif'
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "55%",
          endingShape: "rounded"
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ["transparent"]
      },
      xaxis: {
        categories: this.metrics.stockLevels.map(s => {
          const detailStr = this.getTechnicalDetailsString(s.technicalDetails);
          return detailStr ? `${s.designation} | ${detailStr}` : s.designation;
        }),
        labels: {
          rotate: -45,
          trim: true,
          style: {
            fontSize: '10px'
          }
        }
      },
      yaxis: {
        title: {
          text: "Quantité"
        }
      },
      fill: {
        opacity: 1
      },
      tooltip: {
        y: {
          formatter: function (val: any) {
            return val + " unités";
          }
        }
      },
      colors: ["#3d7a7f", "#e74c3c"]
    };

    this.flowChartOptions = {
      series: [
        {
          name: "Entrées",
          data: this.metrics.movementFlows.map(f => f.entryQty)
        },
        {
          name: "Sorties",
          data: this.metrics.movementFlows.map(f => f.exitQty)
        }
      ],
      chart: {
        type: "area",
        height: 350,
        fontFamily: 'Inter, sans-serif'
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: "smooth",
        width: 3
      },
      xaxis: {
        type: "datetime",
        categories: this.metrics.movementFlows.map(f => f.date)
      },
      tooltip: {
        x: {
          format: "dd/MM/yy"
        }
      },
      colors: ["#3d7a7f", "#ea580c"],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.1,
          stops: [0, 90, 100]
        }
      }
    };
  }

  getPredictionClass(days: number): string {
    if (days < 7) return 'critical';
    if (days < 15) return 'warning';
    return 'safe';
  }

  getTechnicalDetailsString(details: any): string {
    if (!details) return '';
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) this.searchTerm = '';
  }

  selectPiece(p: any) {
    if (!p) {
      this.selectedPieceIds = [];
      this.showDropdown = false;
    } else {
      const index = this.selectedPieceIds.indexOf(p.id);
      if (index > -1) {
        this.selectedPieceIds.splice(index, 1);
      } else {
        this.selectedPieceIds.push(p.id);
      }
    }
    this.onPieceChange();
  }

  isPieceSelected(id: number): boolean {
    return this.selectedPieceIds.includes(id);
  }

  onPieceChange() {
    this.loadMetrics();
  }

  getLogoUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('data:image/') || url.startsWith('http')) return url;
    if (url.startsWith('/api/images') || url.startsWith('/uploads')) {
        return `http://localhost:8081${url}`;
    }
    if (url.includes('/remote.php/dav/files/')) {
        const parts = url.split('/');
        return `http://localhost:8081/api/images/${parts[parts.length - 1]}`;
    }
    return url;
  }
}
