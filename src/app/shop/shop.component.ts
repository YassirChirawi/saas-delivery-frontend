import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, NgZone } from '@angular/core';

declare var google: any;

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
export class ShopComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('addressInput') addressInput!: ElementRef;


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
  guestAddress: string = '';

  // Promo
  promoCodeInput: string = '';
  promoMessage: string = '';
  promoSuccess: boolean = false;

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
    private orderService: OrderService,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      // 1. Charger les infos du Resto (Temps Réel pour ouverture/fermeture)
      this.api.getRestaurantRealtime(id).subscribe(data => {
        this.currentRestaurant = data;

        // Vérif immédiate + Timer
        this.checkOpeningStatus();
        if (!this.timeCheckerInterval) {
          this.timeCheckerInterval = setInterval(() => this.checkOpeningStatus(), 60000);
        }
      });

      // 2. Charger les Produits (C'EST ICI QUE ÇA MANQUAIT !)
      this.loadProducts(id);
    }

    // 3. Panier & Auth
    this.cartService.cart$.subscribe(items => {
      this.cartItems = items;
      this.cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
      this.cartTotal = this.cartService.getTotalPrice();
    });

    this.auth.user$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnDestroy() {
    if (this.timeCheckerInterval) {
      clearInterval(this.timeCheckerInterval);
    }
  }

  ngAfterViewInit(): void {
    // Initialiser l'autocomplete si l'input est déjà présent (ex: rechargement)
    if (this.showCheckoutModal && this.deliveryOption === 'delivery') {
      setTimeout(() => this.initAutocomplete(), 500);
    }
  }

  initAutocomplete() {
    if (!this.addressInput) return;

    const autocomplete = new google.maps.places.Autocomplete(this.addressInput.nativeElement, {
      types: ['address'],
      componentRestrictions: { country: 'fr' } // Adapter si besoin (ex: 'ma', 'dz', 'tn')
    });

    autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place: google.maps.places.PlaceResult = autocomplete.getPlace();
        if (place.geometry && place.formatted_address) {
          this.guestAddress = place.formatted_address;
        } else {
          this.guestAddress = this.addressInput.nativeElement.value;
        }
      });
    });
  }

  // Hook pour ré-initialiser l'autocomplete quand on bascule sur "Livraison"
  watchDeliveryOption() {
    if (this.deliveryOption === 'delivery') {
      setTimeout(() => this.initAutocomplete(), 200);
    }
  }


  // 👇 NOUVELLE MÉTHODE POUR CHARGER LES PRODUITS CORRECTEMENT
  loadProducts(restaurantId: string) {
    this.api.getProductsByRestaurant(restaurantId).subscribe({
      next: (data) => {
        console.log(`📦 ${data.length} produits chargés`);
        this.allProducts = data;

        // 1. Générer les catégories uniques (en ignorant les vides)
        const categories = data.map((p: any) => p.category).filter((c: any) => c && c.trim() !== '');
        this.uniqueCategories = [...new Set(categories)].sort();

        // 2. Initialiser l'affichage
        this.applyFilters();
      },
      error: (err) => console.error("Erreur chargement produits", err)
    });
  }

  // --- FILTRES ---

  applyFilters() {
    let temp = this.allProducts;

    // Filtre Catégorie
    if (this.selectedCategory !== 'Tout') {
      temp = temp.filter(p => p.category === this.selectedCategory);
    }

    // Filtre Recherche
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

  // --- ACTIONS PANIER ---

  addToCart(product: Product) {
    if (!this.currentUser) {
      if (confirm("Vous devez avoir un compte pour commander. Se connecter ?")) {
        this.router.navigate(['/login']);
      }
      return;
    }

    if (this.cartItems.length > 0 && this.cartItems[0].restaurantId !== this.currentRestaurant.id) {
      if (!confirm("Votre panier contient des produits d'un autre restaurant. Vider le panier ?")) return;
      this.cartService.clearCart();
    }

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

  deliveryOptionChanged() {
    if (this.deliveryOption === 'delivery') {
      setTimeout(() => this.initAutocomplete(), 100);
    }
  }

  openCheckout() {
    if (this.isRestaurantOpen) {
      this.showCheckoutModal = true;
      // Si déjà en livraison par défaut
      if (this.deliveryOption === 'delivery') {
        setTimeout(() => this.initAutocomplete(), 100);
      }
    }
  }

  closeCheckout() {
    this.showCheckoutModal = false;
  }

  async confirmOrder() {
    if (this.deliveryOption === 'delivery' && !this.guestAddress) {
      alert("Merci d'indiquer votre adresse !");
      return;
    }
    if (!this.currentUser) return;

    const finalTotal = this.cartTotal + (this.deliveryOption === 'delivery' ? 2 : 0);

    const newOrder = {
      restaurantId: this.currentRestaurant.id,
      restaurantName: this.currentRestaurant.name,
      userId: this.currentUser.uid,
      clientName: this.currentUser.displayName || this.currentUser.email,
      clientPhone: this.currentUser.phoneNumber || 'Non renseigné',
      clientAddress: this.deliveryOption === 'delivery' ? this.guestAddress : 'Sur place',
      deliveryOption: this.deliveryOption,
      items: this.cartItems,
      total: finalTotal,
      note: this.orderNote || ''
    };

    try {
      const orderId = await this.orderService.createOrder(newOrder);
      const message = this.orderService.formatWhatsAppMessage(newOrder, orderId);

      const rawPhone = this.currentRestaurant.whatsappPhone || this.currentRestaurant.phoneNumber || this.currentRestaurant.phone;
      if (!rawPhone) {
        alert("Pas de numéro configuré pour ce restaurant.");
        return;
      }

      const url = `https://wa.me/${this.formatPhoneForWhatsApp(rawPhone)}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');

      this.cartService.clearCart();
      this.closeCheckout();
      this.router.navigate(['/order-tracking', orderId]);
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la commande.");
    }
  }

  applyPromo() {
    if (!this.promoCodeInput) return;

    // Reset
    this.promoMessage = '';
    this.promoSuccess = false;

    if (!this.currentRestaurant || !this.currentRestaurant.id) {
      this.promoMessage = "Erreur restaurant";
      return;
    }

    this.orderService.verifyPromoCode(this.promoCodeInput, this.cartTotal, this.currentRestaurant.id).subscribe({
      next: (res: any) => {
        if (res.valid) {
          this.cartService.applyDiscount(this.promoCodeInput, res.discount);
          this.promoSuccess = true;
          this.promoMessage = `Code appliqué ! -${res.discount} DH`;
          this.cartTotal = this.cartService.getTotalPrice(); // Update UI
        } else {
          this.promoSuccess = false;
          this.promoMessage = res.message || 'Code invalide';
          this.cartService.applyDiscount('', 0);
          this.cartTotal = this.cartService.getTotalPrice();
        }
      },
      error: (err) => {
        console.error(err);
        this.promoSuccess = false;
        this.promoMessage = 'Erreur lors de la vérification';
      }
    });
  }


  formatPhoneForWhatsApp(phone: string): string {
    if (!phone) return "";
    let clean = phone.replace(/[^\d]/g, '');
    if (clean.startsWith('0')) clean = '33' + clean.substring(1);
    return clean;
  }

  checkOpeningStatus() {
    if (!this.currentRestaurant?.openingHours) {
      this.isRestaurantOpen = true;
      this.openingStatusLabel = '🟢 Ouvert';
      return;
    }

    const now = new Date();
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todaySchedule = this.currentRestaurant.openingHours[dayKeys[now.getDay()]];

    if (!todaySchedule || todaySchedule.closed) {
      this.isRestaurantOpen = false;
      this.openingStatusLabel = '🔴 Fermé';
      return;
    }

    const currentStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    if (currentStr >= todaySchedule.open && currentStr < todaySchedule.close) {
      this.isRestaurantOpen = true;
      this.openingStatusLabel = `🟢 Ouvert jusqu'à ${todaySchedule.close}`;
    } else {
      this.isRestaurantOpen = false;
      this.openingStatusLabel = currentStr < todaySchedule.open ? `🔴 Ouvre à ${todaySchedule.open}` : '🔴 Fermé';
    }
  }
}
