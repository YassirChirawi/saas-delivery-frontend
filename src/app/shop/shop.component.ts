import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service'; // ✅ Nouveau
import { Product } from '../models/product.model';
import { Restaurant } from '../models/restaurant.model';

@Component({
  selector: 'app-shop',
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.css'] // Assure-toi d'avoir le CSS pour le modal
})
export class ShopComponent implements OnInit {

  // --- DONNÉES RESTO & PRODUITS ---
  currentRestaurantId: string | null = null;
  currentRestaurant: Restaurant | null = null;

  allProducts: Product[] = [];      // Source de vérité
  displayedProducts: Product[] = []; // Liste filtrée affichée
  uniqueCategories: string[] = [];  // Liste des catégories (ex: Burger, Boisson)

  // --- PANIER & UX ---
  cartCount = 0;
  cartTotal = 0;
  deliveryOption: 'pickup' | 'delivery' = 'pickup';
  selectedZoneName: string = '';

  // --- FILTRES & RECHERCHE ---
  searchTerm: string = '';
  selectedCategory: string = 'Tout';
  isFavorite: boolean = false;

  // --- CHECKOUT & UTILISATEUR ---
  currentUser: any = null;
  showCheckoutModal: boolean = false;

  // Champs du formulaire Checkout
  orderNote: string = '';
  guestName: string = '';
  guestPhone: string = '';

  constructor(
    private apiService: ApiService,
    private cartService: CartService,
    private authService: AuthService, // ✅ Injection Auth
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // 1. Récupérer l'utilisateur connecté (si il y en a un)
    this.authService.user$.subscribe(user => this.currentUser = user);

    // 2. Écouter le Panier
    this.cartService.cart$.subscribe(items => {
      this.cartCount = items.length;
      this.cartTotal = this.cartService.getTotalPrice();
    });

    // 3. Charger les données du Resto
    this.currentRestaurantId = this.route.snapshot.paramMap.get('id');
    if (this.currentRestaurantId) {
      this.loadRestaurantData(this.currentRestaurantId);
      this.checkIfFavorite();
    }
  }

  loadRestaurantData(id: string) {
    // A. Infos Restaurant
    this.apiService.getRestaurantById(id).subscribe({
      next: (data) => {
        this.currentRestaurant = data;
        this.addToHistory(data); // ✅ Historique auto
      },
      error: (err) => console.error("Erreur chargement resto", err)
    });

    // B. Produits
    this.apiService.getProductsByRestaurant(id).subscribe({
      next: (data) => {
        this.allProducts = data;
        this.displayedProducts = data;
        // Extraction des catégories uniques
        this.uniqueCategories = [...new Set(data.map(p => p.category))].filter(Boolean);
      },
      error: (err) => console.error(err)
    });
  }

  // --- FILTRES (Recherche + Catégorie) ---
  applyFilters() {
    let temp = this.allProducts;

    // 1. Filtre Catégorie
    if (this.selectedCategory !== 'Tout') {
      temp = temp.filter(p => p.category === this.selectedCategory);
    }

    // 2. Filtre Recherche
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

  // --- GESTION FAVORIS & HISTORIQUE (LocalStorage) ---
  toggleFavorite() {
    let favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (this.isFavorite) {
      favs = favs.filter((id: string) => id !== this.currentRestaurantId);
    } else {
      favs.push(this.currentRestaurantId);
    }
    localStorage.setItem('favorites', JSON.stringify(favs));
    this.isFavorite = !this.isFavorite;
  }

  checkIfFavorite() {
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    this.isFavorite = favs.includes(this.currentRestaurantId);
  }

  addToHistory(resto: Restaurant) {
    let history = JSON.parse(localStorage.getItem('history') || '[]');
    history = history.filter((r: any) => r.uid !== resto.id);
    history.unshift({ uid: resto.id, name: resto.name, imageUrl: resto.imageUrl });
    localStorage.setItem('history', JSON.stringify(history.slice(0, 5)));
  }

  // --- PANIER & CHECKOUT ---
  addToCart(product: Product) {
    this.cartService.addToCart(product);
  }

  openCheckout() {
    if (this.cartCount === 0) return;
    this.showCheckoutModal = true;
  }

  closeCheckout() {
    this.showCheckoutModal = false;
  }

  goToRegister() {
    this.closeCheckout();
    this.router.navigate(['/register']);
  }

  // --- VALIDATION FINALE ---
  confirmOrder(type: 'USER' | 'GUEST') {
    if (type === 'GUEST' && (!this.guestName || !this.guestPhone)) {
      alert("Merci d'indiquer votre nom et téléphone pour la livraison.");
      return;
    }

    const orderData = {
      items: this.cartService.getCartItems().map(item => ({
        productId: item.id,  // ✅ On garde le lien avec ton modèle Product existant
        name: item.name,      // ✅ Snapshot
        price: item.price,    // ✅ Snapshot
        quantity: item.quantity
      })),
      restaurantId: this.currentRestaurantId,
      restaurantName: this.currentRestaurant?.name,
      totalPrice: this.cartTotal,
      deliveryType: this.deliveryOption,
      deliveryZone: this.selectedZoneName,
      note: this.orderNote, // ✅ Remarque client
      status: 'PENDING',
      createdAt: new Date(),
      // Infos Client
      customerId: type === 'USER' ? this.currentUser.uid : null,
      guestInfo: type === 'GUEST' ? { name: this.guestName, phone: this.guestPhone } : null
    };

    console.log("Envoi commande...", orderData);

    // 1. Envoi au Backend (Firestore)
    this.apiService.createOrder(orderData).subscribe({
      next: (orderId) => {
        console.log("Commande créée ID:", orderId);
        this.cartService.clearCart();
        this.closeCheckout();

        // 2. Redirection WhatsApp (Le fallback qui rassure)
        this.openWhatsApp(orderData, orderId);
      },
      error: (err) => {
        console.error("Erreur création commande", err);
        alert("Erreur technique. Essai via WhatsApp uniquement.");
        this.openWhatsApp(orderData, "ERREUR_API");
      }
    });
  }

  openWhatsApp(order: any, refId: string) {
    const phone = this.currentRestaurant?.whatsappPhone || "33600000000";
    let msg = `Nouvelle Commande #${refId.substring(0,5)} 🧾\n`;

    if(order.guestInfo) msg += `Client: ${order.guestInfo.name} (${order.guestInfo.phone})\n`;
    else msg += `Client Connecté\n`;

    msg += `----------------\n`;
    order.items.forEach((item: any) => msg += `- ${item.quantity}x ${item.name}\n`);
    msg += `----------------\n`;

    if (order.note) msg += `📝 Note: ${order.note}\n`;
    msg += `💰 Total: ${order.totalPrice} €\n`;
    msg += `🚚 Mode: ${order.deliveryType}`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  getEmoji(category: string): string {
    if (!category) return '🍽️';
    const c = category.toUpperCase();
    if (c.includes('BURGER')) return '🍔';
    if (c.includes('SUSHI')) return '🍣';
    if (c.includes('PIZZA')) return '🍕';
    if (c.includes('BOISSON')) return '🥤';
    if (c.includes('DESSERT')) return '🍰';
    return '🍽️';
  }
}
