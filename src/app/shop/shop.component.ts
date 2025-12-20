import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { CartService, CartItem } from '../services/cart.service';
import { AuthService } from '../services/auth.service'; // Assure-toi d'avoir ce service
import { Product } from '../models/product.model';
import { OrderService } from '../services/order.service';

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
    public auth: AuthService,
    private orderService: OrderService
  ) {
  }

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
    // 🔒 SÉCURITÉ : Si pas connecté, on redirige
    if (!this.currentUser) {
      const wantToLogin = confirm("Vous devez avoir un compte pour commander. Voulez-vous vous connecter ou créer un compte ?");
      if (wantToLogin) {
        this.router.navigate(['/register']); // Ou '/login'
      }
      return; // On arrête tout, on n'ajoute rien au panier
    }

    // 👇 LE RESTE DU CODE RESTE PAREIL (Gestion panier, conflit resto...)
    if (!product.restaurantId && this.currentRestaurant) {
      product.restaurantId = this.currentRestaurant.id;
    }
    const success = this.cartService.addToCart(product);
    // ...
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

  formatPhoneForWhatsApp(phone: string): string {
    if (!phone) return "";

    // 1. On enlève tout ce qui n'est pas un chiffre (espaces, tirets, parenthèses...)
    let clean = phone.replace(/[^\d]/g, '');

    // 2. Gestion du format français (Si commence par 0, on remplace par 33)
    if (clean.startsWith('0')) {
      clean = '33' + clean.substring(1);
    }

    // 3. Si le numéro commence déjà par 33 (ex: importé depuis un Excel), on laisse tel quel.
    return clean;
  }

  // --- VALIDATION COMMANDE (WHATSAPP) ---

  async confirmOrder() {

    // 1. Validation de l'Adresse si Livraison
    if (this.deliveryOption === 'delivery' && !this.guestAddress) {
      alert("Merci d'indiquer votre adresse de livraison ! 🏠");
      return;
    }

    // 2. Plus besoin de valider le nom/tel invité car on utilise le User connecté
    if (!this.currentUser) {
      alert("Session expirée. Veuillez vous reconnecter.");
      this.router.navigate(['/login']);
      return;
    }

    const finalTotal = this.cartTotal + (this.deliveryOption === 'delivery' ? 2 : 0);

    // 3. On prend les infos DIRECTEMENT depuis le profil connecté
    // Astuce : Si le user n'a pas mis de tel dans son profil, on peut utiliser celui du formulaire "guestPhone" si tu veux le laisser en secours,
    // mais le mieux est de prendre celui de l'auth.
    const clientName = this.currentUser.displayName || this.currentUser.email;
    const clientPhone = this.currentUser.phoneNumber || this.guestPhone || 'Non renseigné';
    // (Note: tu peux garder les champs inputs dans le HTML pré-remplis si tu veux permettre de changer le tel pour cette commande)

    const newOrder = {
      restaurantId: this.currentRestaurant.id,
      restaurantName: this.currentRestaurant.name,
      userId: this.currentUser.uid, // 👈 LE PLUS IMPORTANT : On lie la commande au compte !
      clientName: clientName,
      clientPhone: clientPhone,
      clientAddress: this.deliveryOption === 'delivery' ? this.guestAddress : 'Sur place',
      deliveryOption: this.deliveryOption,
      items: this.cartItems,
      total: finalTotal,
      note: this.orderNote || ''
    };

    try {
      // ... (La suite reste identique : createOrder, message WhatsApp, redirection) ...
      const orderId = await this.orderService.createOrder(newOrder);
      const message = this.orderService.formatWhatsAppMessage(newOrder, orderId);

      const rawPhone = this.currentRestaurant.phoneNumber || this.currentRestaurant.phone;
      if (!rawPhone) {
        alert("Pas de numéro resto");
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
}
