import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-restaurant-orders',
  templateUrl: './restaurant-orders.component.html',
})
export class RestaurantOrdersComponent {

  // 👇 On reçoit la liste des commandes depuis le composant Admin
  @Input() orders: any[] = [];

  // 👇 On prévient le parent quand on clique sur un bouton
  @Output() statusChanged = new EventEmitter<{order: any, newStatus: string}>();

  constructor() {}

  // Appelé quand on clique sur un bouton d'action
  updateStatus(order: any, newStatus: string) {
    this.statusChanged.emit({ order, newStatus });
  }

  // Helper pour les couleurs (Design)
  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'DELIVERING': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'DONE': return 'bg-green-100 text-green-800 border-green-300';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100';
    }
  }
  getShortId(id: string): string {
    if (!id) return '';
    return id.substring(0, 4).toUpperCase();
  }

  // Remplace le pipe | date
  formatTime(timestamp: number): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    // Retourne l'heure (ex: 14:05)
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
