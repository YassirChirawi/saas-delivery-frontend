import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../services/api.service';
import { CartService } from '../services/cart.service';
import { Product } from '../models/product.model';
import { Restaurant } from '../models/restaurant.model'; // Import du modèle

@Component({
  selector: 'app-shop',
  templateUrl: './shop.component.html'
})
export class ShopComponent implements OnInit {
  products: Product[] = [];
  cartCount = 0;
  cartTotal = 0;
  deliveryOption: 'pickup' | 'delivery' = 'pickup';
  selectedZoneName: string = '';

  currentRestaurantId: string | null = null;

  // 👇 NOUVEAU : On stocke l'objet Restaurant complet ici
  currentRestaurant: Restaurant | null = null;

  constructor(
    private apiService: ApiService,
    private cartService: CartService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.currentRestaurantId = this.route.snapshot.paramMap.get('id');

    if (this.currentRestaurantId) {

      // 1. Charger les produits (comme avant)
      this.apiService.getProductsByRestaurant(this.currentRestaurantId).subscribe({
        next: (data) => this.products = data,
        error: (err) => console.error(err)
      });

      // 2. 👇 Charger les infos du restaurant (Nom, Téléphone...)
      this.apiService.getRestaurantById(this.currentRestaurantId).subscribe({
        next: (data) => {
          this.currentRestaurant = data;
          console.log("Resto chargé :", this.currentRestaurant);
        },
        error: (err) => console.error("Impossible de charger le resto", err)
      });
    }

    this.cartService.cart$.subscribe(items => {
      this.cartCount = items.length;
      this.cartTotal = this.cartService.getTotalPrice();
    });
  }

  addToCart(product: Product) {
    this.cartService.addToCart(product);
  }

  setDelivery(option: 'pickup' | 'delivery') {
    this.deliveryOption = option;
    if (option === 'pickup') {
      this.cartService.setDeliveryFee(0);
      this.selectedZoneName = '';
    } else {
      this.cartService.setDeliveryFee(2);
      this.selectedZoneName = 'Zone 1 (Centre)';
    }
  }

  onZoneChange(event: any) {
    const fee = Number(event.target.value);
    const index = event.target.selectedIndex;
    this.selectedZoneName = event.target.options[index].text;
    this.cartService.setDeliveryFee(fee);
  }

  // 👇 LA FONCTION MISE A JOUR
  orderOnWhatsApp() {
    const items = this.cartService.getCartItems();

    // 1. Récupération dynamique du numéro
    // Si le resto est chargé, on prend son numéro, sinon un numéro de secours
    const restoPhone = this.currentRestaurant?.whatsappPhone || "33600000000";
    const restoName = this.currentRestaurant?.name || "le restaurant";

    let message = `Bonjour ${restoName} ! Je voudrais commander : \n`;
    items.forEach(item => message += `- ${item.name} (${item.price}€)\n`);
    message += `\n----------------`;

    if (this.deliveryOption === 'pickup') {
      message += `\n🛍️ *Mode : À EMPORTER*`;
    } else {
      message += `\n🛵 *Mode : LIVRAISON*`;
      message += `\n📍 Zone : ${this.selectedZoneName}`;
    }

    message += `\n💰 *Total : ${this.cartTotal} €*`;

    if (this.deliveryOption === 'delivery') {
      message += `\n\n(Mon adresse : ...)`;
    }

    window.open(`https://wa.me/${restoPhone}?text=${encodeURIComponent(message)}`, '_blank');
  }

  getEmoji(category: string): string {
    if (!category) return '🍽️';
    const cat = category.toUpperCase();
    if (cat.includes('BURGER')) return '🍔';
    if (cat.includes('PIZZA')) return '🍕';
    if (cat.includes('SUSHI')) return '🍣';
    return '🍽️';
  }
}
