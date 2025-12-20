import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { CartService, CartItem } from '../services/cart.service';
import { AuthService } from '../services/auth.service'; // Assure-toi d'avoir ce service
import { Product } from '../models/product.model';

@Component({
  selector: 'app-shop',
  templateUrl: './shop.component.html',

})
export class ShopComponent implements OnInit {

  // Données Restaurant & Produits
  currentRestaurant: any;
  allProducts: any[] = [];
  displayedProducts: any[] = [];
  uniqueCategories: string[] = [];
  selectedCategory: string = 'Tout';
  searchTerm: string = '';
  isFavorite: boolean = false; // Juste visuel pour l'instant

  // Données Panier (Celles qui manquaient !)
  cartItems: CartItem[] = [];
  cartCount: number = 0;
  cartTotal: number = 0;

  // Modale & Commande
  showCheckoutModal: boolean = false;
  deliveryOption: 'pickup' | 'delivery' = 'pickup';
  orderNote: string = '';

  // Utilisateur / Invité
  currentUser: any = null;
  guestName: string = '';
  guestPhone: string = '';
  guestAddress: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private cartService: CartService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    // 1. Récupérer l'ID du resto depuis l'URL
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadRestaurantData(id);
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

  loadRestaurantData(id: string) {
    this.api.getRestaurantById(id).subscribe(data => {
      this.currentRestaurant = data;
    });

    this.api.getProductsByRestaurant(id).subscribe(data => {
      this.allProducts = data;
      this.displayedProducts = data;
      // Extraire les catégories uniques
      this.uniqueCategories = [...new Set(data.map(p => p.category))].sort();
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

  getEmoji(category: string): string {
    const lower = category.toLowerCase();
    if (lower.includes('burger')) return '🍔';
    if (lower.includes('pizza')) return '🍕';
    if (lower.includes('sushi') || lower.includes('japon')) return '🍣';
    if (lower.includes('dessert') || lower.includes('sucré')) return '🍰';
    if (lower.includes('boisson')) return '🥤';
    return '🍽️';
  }

  // --- ACTIONS PANIER (AJOUT / SUPPRESSION) ---

  addToCart(product: Product) {
    // Sécurité : Associer l'ID du resto au produit si manquant
    if (!product.restaurantId && this.currentRestaurant) {
      product.restaurantId = this.currentRestaurant.id;
    }

    const success = this.cartService.addToCart(product);

    if (!success) {
      const confirmSwitch = confirm("Votre panier contient des produits d'un autre restaurant. Vider le panier pour commander ici ?");
      if (confirmSwitch) {
        this.cartService.clearCart();
        this.cartService.addToCart(product);
      }
    }
  }

  decreaseQuantity(item: CartItem) {
    this.cartService.updateQuantity(item.id, item.quantity - 1);
  }

  removeFromCart(id: string) {
    this.cartService.removeFromCart(id);
  }

  // --- MODALE & CHECKOUT ---

  openCheckout() {
    this.showCheckoutModal = true;
  }

  closeCheckout() {
    this.showCheckoutModal = false;
  }

  toggleFavorite() {
    this.isFavorite = !this.isFavorite;
    // Ici tu peux appeler ton API pour sauvegarder le favori
  }

  goToRegister() {
    this.closeCheckout();
    this.router.navigate(['/register']);
  }

  // --- VALIDATION COMMANDE (WHATSAPP) ---

  confirmOrder(type: 'USER' | 'GUEST') {
    // 1. Validation de l'Adresse si Livraison
    if (this.deliveryOption === 'delivery' && !this.guestAddress) {
      alert("Merci d'indiquer votre adresse de livraison ! 🏠");
      return;
    }

    // 2. Validation Nom/Tel si Invité
    if (type === 'GUEST' && (!this.guestName || !this.guestPhone)) {
      alert("Merci de remplir votre nom et téléphone pour qu'on puisse vous contacter !");
      return;
    }

    const deliveryCost = this.deliveryOption === 'delivery' ? 2 : 0;
    const finalTotal = this.cartTotal + deliveryCost;

    const clientName = type === 'USER' ? (this.currentUser.displayName || this.currentUser.email) : this.guestName;
    const clientPhone = type === 'USER' ? (this.currentUser.phoneNumber || 'Non renseigné') : this.guestPhone;

    // --- CONSTRUCTION DU MESSAGE ---
    let message = `🛒 *NOUVELLE COMMANDE* (${type === 'USER' ? 'Membre' : 'Invité'})\n`;
    message += `👤 Nom : ${clientName}\n`;
    message += `📞 Tel : ${clientPhone}\n`;

    // Ajout de l'adresse dans le message
    if (this.deliveryOption === 'delivery') {
      message += `🏠 *LIVRAISON* : ${this.guestAddress}\n`;
    } else {
      message += `🚶 *À EMPORTER*\n`;
    }

    message += `\n📋 *Détail :*\n`;
    this.cartItems.forEach(item => {
      message += `▫️ ${item.quantity}x ${item.name} (${item.price * item.quantity}€)\n`;
    });

    if (this.orderNote) message += `\n📝 Note : ${this.orderNote}`;

    message += `\n💰 *TOTAL : ${finalTotal} €*`;
    message += `\n📍 Restaurant : ${this.currentRestaurant.name}`;

    const restoPhone = this.currentRestaurant.phoneNumber || "33600000000";
    const url = `https://wa.me/${restoPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    this.cartService.clearCart();
    this.closeCheckout();
    this.router.navigate(['/order-tracking']);
  }
}
