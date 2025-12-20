import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OrderService } from '../services/order.service';

@Component({
  selector: 'app-order-tracking',
  templateUrl: './order-tracking.component.html',
})
export class OrderTrackingComponent implements OnInit {

  order: any;
  loading = true;

  // Les étapes visuelles de la commande
  steps = [
    { status: 'PENDING', label: 'Envoyée', icon: '📩', description: 'En attente du restaurant' },
    { status: 'CONFIRMED', label: 'Confirmée', icon: '👨‍🍳', description: 'En préparation' },
    { status: 'DELIVERING', label: 'Prête / Livraison', icon: '🛵', description: 'En route vers vous' },
    { status: 'DONE', label: 'Terminée', icon: '✅', description: 'Bon appétit !' }
  ];

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    // 1. On récupère l'ID dans l'URL (ex: /order-tracking/7dhs8...)
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      // 2. Abonnement Temps Réel (Magique !)
      this.orderService.getOrderRealtime(id).subscribe({
        next: (data) => {
          this.order = data;
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
        }
      });
    }
  }

  // Vérifie si une étape est passée ou active
  isStepActive(stepStatus: string): boolean {
    if (!this.order) return false;

    const statusOrder = ['PENDING', 'CONFIRMED', 'DELIVERING', 'DONE'];
    const currentIdx = statusOrder.indexOf(this.order.status);
    const stepIdx = statusOrder.indexOf(stepStatus);

    return currentIdx >= stepIdx;
  }
}
