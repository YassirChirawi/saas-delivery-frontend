import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { CartService, CartItem } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { Product } from '../models/product.model';
import { OrderService } from '../services/order.service';

@Component({
  selector: 'app-shop',
  templateUrl: './shop.component.html',
})
export class ShopComponent implements OnInit, OnDestroy {

  // Données Restaurant & Produits
  currentRestaurant: any;
  allProducts: any[] = [];
  displayedProducts: any[] = [];

  // Filtres
  uniqueCategories: string[] = [];
  selectedCategory: string = 'Tout';
  searchTerm: string = '';

  // Panier
  cartItems: CartItem[] = [];
  cartCount: number = 0;
  cartTotal: number = 0;

  // Modale & Commande
  showCheckoutModal: boolean = false;
  deliveryOption: 'pickup' | 'delivery' = 'pickup';
  orderNote: string = '';
  guestAddress: string = ''; // Adresse si livraison

  // Utilisateur
  currentUser: any = null;

  // Horaires & État
  isRestaurantOpen = false;
  openingStatusLabel = 'Chargement...';
  private timeCheckerInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private cartService: CartService,
    public auth: AuthService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    // 1. Récupérer l'ID du resto depuis l'URL
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.api.getRestaurantRealtime(id).subscribe(data => {
        console.log("Mise à jour reçue du resto :", data); // Pour vérifier
        this.currentRestaurant = data; // Pas besoin de rajouter {id, ...} car le service le fait

        // On revérifie l'ouverture immédiatement dès que les données changent
        this.checkOpeningStatus();

        // Si le timer n'est pas lancé, on le lance
        if (!this.timeCheckerInterval) {
          this.timeCheckerInterval = setInterval(() => this.checkOpeningStatus(), 60000);
        }
      });
    }

    // 2. Écouter le Panier (Mise à jour temps réel)
    this.cartService.cart$.subscribe(items => {
      this.cartItems = items;
      this.cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
      this.cartTotal = this.cartService.getTotalPrice();
    });

    // 3. Vérifier si utilisateur connecté
    this.auth.user$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnDestroy() {
    if (this.timeCheckerInterval) {
      clearInterval(this.timeCheckerInterval);
    }
  }

  loadRestaurantData(id: string) {
    // Charger les infos du resto
    this.api.getRestaurantById(id).subscribe(data => {
      this.currentRestaurant = { id, ...data };

      // Lancer la vérification des horaires
      this.checkOpeningStatus();
      this.timeCheckerInterval = setInterval(() => this.checkOpeningStatus(), 60000);
    });

    // Charger les produits
    this.api.getProductsByRestaurant(id).subscribe(data => {
      this.allProducts = data;
      this.displayedProducts = data;
      this.uniqueCategories = [...new Set(data.map((p: any) => p.category))].sort();
    });
  }

  // --- FILTRES ---

  applyFilters() {
    let temp = this.allProducts;

    if (this.selectedCategory !== 'Tout') {
      temp = temp.filter(p => p.category === this.selectedCategory);
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      temp = temp.filter(p => p.name.toLowerCase().includes(term));
    }

    this.displayedProducts = temp;
  }

  selectCategory(cat: string) {
    this.selectedCategory = cat;
    this.applyFilters();
  }

  scrollToCategory(category: string) {
    // Si tu veux scroller, sinon garde ta logique de filtre
    this.selectedCategory = category;
    this.applyFilters();
  }

  // --- ACTIONS PANIER ---

  addToCart(product: Product) {
    // 🔒 SÉCURITÉ : Si pas connecté, on bloque
    if (!this.currentUser) {
      const wantToLogin = confirm("Vous devez avoir un compte pour commander. Voulez-vous vous connecter ou créer un compte ?");
      if (wantToLogin) {
        this.router.navigate(['/login']);
      }
      return;
    }

    // Vérification conflit Restaurant
    if (this.cartItems.length > 0 && this.cartItems[0].restaurantId !== this.currentRestaurant.id) {
      if (!confirm("Votre panier contient des produits d'un autre restaurant. Vider le panier ?")) {
        return;
      }
      this.cartService.clearCart();
    }

    // Ajout ID resto
    const itemToAdd = { ...product, restaurantId: this.currentRestaurant.id };
    this.cartService.addToCart(itemToAdd);
  }

  decreaseQuantity(item: CartItem) {
    this.cartService.updateQuantity(item.id, item.quantity - 1);
  }

  removeFromCart(id: string) {
    this.cartService.removeFromCart(id);
  }

  // --- MODALE & CHECKOUT ---

  openCheckout() {
    // Sécurité supplémentaire : on n'ouvre pas si fermé
    if (this.isRestaurantOpen) {
      this.showCheckoutModal = true;
    }
  }

  closeCheckout() {
    this.showCheckoutModal = false;
  }

  // --- VALIDATION COMMANDE ---

  async confirmOrder() {
    if (this.deliveryOption === 'delivery' && !this.guestAddress) {
      alert("Merci d'indiquer votre adresse de livraison ! 🏠");
      return;
    }

    if (!this.currentUser) {
      alert("Session expirée. Veuillez vous reconnecter.");
      this.router.navigate(['/login']);
      return;
    }

    const finalTotal = this.cartTotal + (this.deliveryOption === 'delivery' ? 2 : 0);
    const clientName = this.currentUser.displayName || this.currentUser.email;
    const clientPhone = this.currentUser.phoneNumber || 'Non renseigné';

    const newOrder = {
      restaurantId: this.currentRestaurant.id,
      restaurantName: this.currentRestaurant.name,
      userId: this.currentUser.uid,
      clientName: clientName,
      clientPhone: clientPhone,
      clientAddress: this.deliveryOption === 'delivery' ? this.guestAddress : 'Sur place',
      deliveryOption: this.deliveryOption,
      items: this.cartItems,
      total: finalTotal,
      note: this.orderNote || ''
    };

    try {
      const orderId = await this.orderService.createOrder(newOrder);
      const message = this.orderService.formatWhatsAppMessage(newOrder, orderId);

      // Récupération numéro (Priorité WhatsApp)
      const rawPhone = this.currentRestaurant.whatsappPhone ||
        this.currentRestaurant.phoneNumber ||
        this.currentRestaurant.phone;

      if (!rawPhone) {
        alert("Impossible de commander : Pas de numéro configuré.");
        return;
      }

      const targetPhone = this.formatPhoneForWhatsApp(rawPhone);
      const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');

      this.cartService.clearCart();
      this.closeCheckout();
      this.router.navigate(['/order-tracking', orderId]);

    } catch (error) {
      console.error("Erreur", error);
    }
  }

  // --- UTILITAIRES ---

  formatPhoneForWhatsApp(phone: string): string {
    if (!phone) return "";
    let clean = phone.replace(/[^\d]/g, '');
    if (clean.startsWith('0')) {
      clean = '33' + clean.substring(1);
    }
    return clean;
  }

  checkOpeningStatus() {
    if (!this.currentRestaurant || !this.currentRestaurant.openingHours) {
      this.isRestaurantOpen = true;
      this.openingStatusLabel = '🟢 Ouvert';
      return;
    }

    const now = new Date();
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = dayKeys[now.getDay()];
    const todaySchedule = this.currentRestaurant.openingHours[todayKey];

    if (!todaySchedule || todaySchedule.closed) {
      this.isRestaurantOpen = false;
      this.openingStatusLabel = '🔴 Fermé aujourd\'hui';
      return;
    }

    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    if (currentTimeStr >= todaySchedule.open && currentTimeStr < todaySchedule.close) {
      this.isRestaurantOpen = true;
      this.openingStatusLabel = `🟢 Ouvert jusqu'à ${todaySchedule.close}`;
    } else {
      this.isRestaurantOpen = false;
      if (currentTimeStr < todaySchedule.open) {
        this.openingStatusLabel = `🔴 Fermé - Ouvre à ${todaySchedule.open}`;
      } else {
        this.openingStatusLabel = `🔴 Fermé depuis ${todaySchedule.close}`;
      }
    }
  }
}
