import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AuthService, UserRole } from '../services/auth.service';
import { OrderService } from '../services/order.service';
import { Restaurant } from '../models/restaurant.model';
import { Product } from '../models/product.model';
import { Router } from '@angular/router';
import { getAuth } from 'firebase/auth';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html'
})
export class AdminComponent implements OnInit {

  // --- GESTION DES ONGLETS ---
  // ✅ CORRECTION : Ajout de 'stats' dans le type
  viewMode: 'orders' | 'products' | 'stats' = 'orders';

  // --- GESTION PRODUITS ---
  productForm: FormGroup;
  products: Product[] = [];
  isSubmitting = false;
  isEditing = false;
  editingProductId: string | null = null;

  // --- GESTION COMMANDES ---
  orders: any[] = [];

  // --- INFO RESTO ---
  myRestaurant: Restaurant | null = null;

  // --- STATISTIQUES ---
  totalRevenue = 0;
  totalOrdersCount = 0;
  todayRevenue = 0;
  averageBasket = 0;

  // --- VARIABLES POUR LES HORAIRES ---
  schedule: any = {};
  days = [
    { key: 'monday', label: 'Lundi' },
    { key: 'tuesday', label: 'Mardi' },
    { key: 'wednesday', label: 'Mercredi' },
    { key: 'thursday', label: 'Jeudi' },
    { key: 'friday', label: 'Vendredi' },
    { key: 'saturday', label: 'Samedi' },
    { key: 'sunday', label: 'Dimanche' }
  ];

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private orderService: OrderService,
    public auth: AuthService,
    private router: Router,
    private route: ActivatedRoute // ✅ Injection de ActivatedRoute
  ) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      category: ['BURGER', Validators.required],
      description: ['', Validators.required],
      imageUrl: [''],
      restaurantId: ['', Validators.required]
    });
  }

  async ngOnInit() {
    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;

    if (!currentUser) return;

    // 1. Récupérer le profil utilisateur
    const profile = await this.auth.getUserProfile(currentUser.uid);

    // 2. Logique Super Admin (Impersonation)
    const impersonatedId = this.route.snapshot.queryParams['impersonate'];

    if (profile && profile.role === UserRole.SUPER_ADMIN) {
      if (impersonatedId) {
        console.log("🕵️ SUPER ADMIN MODE : Gestion du restaurant", impersonatedId);
        // On charge LE restaurant demandé
        this.loadRestaurantById(impersonatedId);
        return;
      } else {
        // Pas d'impersonation -> On retourne au Dashboard Super Admin
        this.router.navigate(['/super-admin']);
        return;
      }
    }

    // 3. Logique Restaurateur Normal
    if (profile && profile.email) {
      this.apiService.getRestaurantByEmail(profile.email).subscribe({
        next: (resto) => {
          if (resto) {
            this.setupRestaurant(resto);
          }
        }
      });
    }
  }

  // Factorisation de la logique de chargement
  loadRestaurantById(id: string) {
    this.apiService.getRestaurantById(id).subscribe(resto => {
      if (resto) this.setupRestaurant(resto);
    });
  }

  setupRestaurant(resto: Restaurant) {
    this.myRestaurant = resto;

    // Pré-remplir le formulaire produit
    this.productForm.patchValue({ restaurantId: resto.id });

    // Initialiser les horaires
    this.initSchedule(resto);

    // Charger les données
    this.loadProducts(resto.id!);
    this.loadOrders(resto.id!);
  }

  // ==========================================
  // 👇 PARTIE COMMANDES & STATS
  // ==========================================

  loadOrders(restaurantId: string) {
    this.orderService.getOrdersByRestaurant(restaurantId).subscribe(data => {
      this.orders = data;
      // ✅ AJOUT : On recalcule les stats à chaque mise à jour des commandes
      this.calculateStats();
    });
  }

  calculateStats() {
    const doneOrders = this.orders.filter(o => o.status === 'DONE');

    this.totalOrdersCount = doneOrders.length;
    this.totalRevenue = doneOrders.reduce((acc, order) => acc + (order.total || 0), 0);
    this.averageBasket = this.totalOrdersCount > 0 ? (this.totalRevenue / this.totalOrdersCount) : 0;

    const todayStr = new Date().toDateString();
    this.todayRevenue = doneOrders
      .filter(o => new Date(o.createdAtTimestamp).toDateString() === todayStr)
      .reduce((acc, order) => acc + (order.total || 0), 0);
  }

  updateOrderStatus(order: any, status: string) {
    this.orderService.updateStatus(order.id, status)
      .then(() => console.log(`Commande #${order.id} passée à ${status}`))
      .catch(err => console.error(err));
  }

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

  // ==========================================
  // 👇 PARTIE PRODUITS (MENU)
  // ==========================================

  loadProducts(restaurantId: string) {
    this.apiService.getProductsByRestaurant(restaurantId).subscribe({
      next: (data) => {
        this.products = data;
      }
    });
  }

  onSubmit() {
    if (this.productForm.invalid || !this.myRestaurant) return;
    this.isSubmitting = true;

    const productData: Product = this.productForm.value;
    if (this.myRestaurant.id != null) {
      productData.restaurantId = this.myRestaurant.id;
    }

    if (this.isEditing && this.editingProductId) {
      // TODO: Implémenter updateProduct dans ApiService
      console.log("Update non implémenté pour", this.editingProductId);
      this.isSubmitting = false;
    } else {
      this.apiService.addProduct(productData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.resetForm();
          this.loadProducts(this.myRestaurant!.id!);
        },
        error: () => this.isSubmitting = false
      });
    }
  }

  editProduct(product: Product) {
    this.isEditing = true;
    this.editingProductId = product.id!;
    this.productForm.patchValue({
      name: product.name,
      price: product.price,
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl,
      restaurantId: product.restaurantId
    });
    this.viewMode = 'products';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.resetForm();
  }

  deleteProduct(id: string) {
    if (confirm('Supprimer ce plat ?')) {
      // TODO: Implémenter deleteProduct dans ApiService
      console.log("Delete non implémenté pour", id);
    }
  }

  resetForm() {
    this.isEditing = false;
    this.editingProductId = null;
    this.productForm.reset({
      category: 'BURGER',
      restaurantId: this.myRestaurant?.id,
      price: 0
    });
  }

  logout() {
    this.auth.logout();
  }

  // ==========================================
  // 👇 PARTIE HORAIRES & REGLAGES
  // ==========================================

  deliveryTime: string = '20-30 min';
  deliveryFees: number = 15;

  // ✅ AJOUT : Cette méthode manquait
  initSchedule(restaurant: Restaurant) {
    const defaultDay = { open: '11:00', close: '22:00', closed: false };

    this.days.forEach(day => {
      if (restaurant.openingHours && restaurant.openingHours[day.key]) {
        this.schedule[day.key] = { ...restaurant.openingHours[day.key] };
      } else {
        this.schedule[day.key] = { ...defaultDay };
      }
    });

    // Init Delivery Info
    if (restaurant.deliveryTime) this.deliveryTime = restaurant.deliveryTime;
    if (restaurant.deliveryFees) this.deliveryFees = restaurant.deliveryFees;
  }

  saveSettings() {
    if (!this.myRestaurant?.id) {
      alert("Erreur: ID Restaurant introuvable");
      return;
    }

    console.log("Sauvegarde paramètres...", this.schedule, this.deliveryTime, this.deliveryFees);

    this.apiService.updateRestaurantSettings(this.myRestaurant.id, {
      openingHours: this.schedule,
      deliveryTime: this.deliveryTime,
      deliveryFees: this.deliveryFees
    }).then(() => {
      alert("Paramètres sauvegardés ! ✅");
    }).catch(err => {
      console.error("Erreur Firebase:", err);
      alert("Erreur lors de la sauvegarde.");
    });
  }

  formatPrice(price: number): string {
    if (price === undefined || price === null) return '0.00';
    return price.toFixed(2); // Méthode standard JavaScript
  }
}
