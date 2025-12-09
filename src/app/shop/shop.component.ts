import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { CartService } from '../services/cart.service';
import { Product } from '../models/product.model';

@Component({
  selector: 'app-shop',
  templateUrl: './shop.component.html'
})
export class ShopComponent implements OnInit {
  products: Product[] = [];
  cartCount = 0;
  cartTotal = 0;

  // NOUVEAU : Variables pour l'état de la livraison
  deliveryOption: 'pickup' | 'delivery' = 'pickup';
  selectedZoneName: string = ''; // Pour le message WhatsApp

  constructor(
    private apiService: ApiService,
    private cartService: CartService
  ) {}

  ngOnInit() {
    this.apiService.getProducts().subscribe(data => {
      this.products = data;
    });

    this.cartService.cart$.subscribe(items => {
      this.cartCount = items.length;
      this.cartTotal = this.cartService.getTotalPrice();
    });
  }

  addToCart(product: Product) {
    this.cartService.addToCart(product);
  }

  // Gère le clic sur "Pick-up" ou "Livraison"
  setDelivery(option: 'pickup' | 'delivery') {
    this.deliveryOption = option;

    if (option === 'pickup') {
      this.cartService.setDeliveryFee(0);
      this.selectedZoneName = '';
    } else {
      // Par défaut, quand on clique sur Livraison, on met la Zone 1 (2€)
      this.cartService.setDeliveryFee(2);
      this.selectedZoneName = 'Zone 1 (Centre)';
    }
  }

  // Gère le changement de zone dans le menu déroulant
  onZoneChange(event: any) {
    const fee = Number(event.target.value);
    const index = event.target.selectedIndex;
    this.selectedZoneName = event.target.options[index].text; // Récupère le texte "Zone 2..."

    this.cartService.setDeliveryFee(fee);
  }

  orderOnWhatsApp() {
    const items = this.cartService.getCartItems();
    const restoPhone = "33612345678";
    const fee = this.cartService.getDeliveryFee();

    let message = "Bonjour ! Je voudrais commander : \n";

    // Liste des plats
    items.forEach(item => {
      message += `- ${item.name} (${item.price}€)\n`;
    });

    message += `\n----------------`;

    // Info Livraison dans le message
    if (this.deliveryOption === 'pickup') {
      message += `\n🛍️ *Mode : À EMPORTER*`;
    } else {
      message += `\n🛵 *Mode : LIVRAISON*`;
      message += `\n📍 Zone : ${this.selectedZoneName}`;
      message += `\n📦 Frais : ${fee}€`;
    }

    message += `\n----------------`;
    message += `\n💰 *TOTAL À PAYER : ${this.cartTotal} €*`;

    if (this.deliveryOption === 'delivery') {
      message += `\n\n(Merci de m'envoyer votre adresse exacte)`;
    }

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${restoPhone}?text=${encodedMessage}`, '_blank');
  }

  getEmoji(category: string): string {
    if (!category) return '🍽️';
    const cat = category.toUpperCase();
    if (cat.includes('BURGER')) return '🍔';
    if (cat.includes('PIZZA')) return '🍕';
    if (cat.includes('BOISSON')) return '🥤';
    if (cat.includes('DESSERT')) return '🍩';
    return '🍽️';
  }
}
