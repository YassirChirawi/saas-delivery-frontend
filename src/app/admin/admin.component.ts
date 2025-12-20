import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { AuthService, UserRole } from '../services/auth.service';
import { OrderService } from '../services/order.service'; // 👈 IMPORT ORDER SERVICE
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
  viewMode: 'orders' | 'products' = 'orders'; // Par défaut, on affiche les commandes (plus important)

  // --- GESTION PRODUITS ---
  productForm: FormGroup;
  products: Product[] = [];
  isSubmitting = false;
  isEditing = false;
  editingProductId: string | null = null;

  // --- GESTION COMMANDES ---
  orders: any[] = []; // 👈 LISTE DES COMMANDES

  // --- INFO RESTO ---
  myRestaurant: Restaurant | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private orderService: OrderService, // 👈 INJECTION
    public auth: AuthService,
    private router: Router
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

    const profile = await this.auth.getUserProfile(currentUser.uid);

    if (profile && profile.role === UserRole.SUPER_ADMIN) {
      this.router.navigate(['/super-admin']);
      return;
    }

    if (profile && profile.email) {
      this.apiService.getRestaurantByEmail(profile.email).subscribe({
        next: (resto) => {
          if (resto) {
            this.myRestaurant = resto;
            this.productForm.patchValue({ restaurantId: resto.id });

            // 👇 ON CHARGE TOUT
            this.loadProducts(resto.id!);
            this.loadOrders(resto.id!);
          }
        }
      });
    }
  }

  // ==========================================
  // 👇 PARTIE COMMANDES (DASHBOARD)
  // ==========================================

  loadOrders(restaurantId: string) {
    // Abonnement Temps Réel
    this.orderService.getOrdersByRestaurant(restaurantId).subscribe(data => {
      this.orders = data;
    });
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
      // TODO: Appeler updateProduct ici quand tu l'auras ajouté dans ApiService
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
    this.viewMode = 'products'; // Force l'affichage de l'onglet produits
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.resetForm();
  }

  deleteProduct(id: string) {
    if(confirm('Supprimer ce plat ?')) {
      // TODO: Appeler deleteProduct ici quand tu l'auras ajouté dans ApiService
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
}
