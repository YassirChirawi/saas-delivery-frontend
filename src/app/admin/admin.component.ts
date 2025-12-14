import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { AuthService, UserRole } from '../services/auth.service';
import { Restaurant } from '../models/restaurant.model';
import { Product } from '../models/product.model';
import { Router } from '@angular/router';
import { getAuth } from 'firebase/auth';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html'
})
export class AdminComponent implements OnInit {
  productForm: FormGroup;
  myRestaurant: Restaurant | null = null;
  products: Product[] = []; // 👈 LA LISTE DES PRODUITS
  isSubmitting = false;
  isEditing = false; // 👈 MODE ÉDITION
  editingProductId: string | null = null; // ID du produit en cours d'édition

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
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

    if (!currentUser) return; // AuthGuard gère la redirection

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
            // 👇 CHARGER LES PRODUITS DU RESTO
            this.loadProducts(resto.id!);
          }
        }
      });
    }
  }

  // 1. CHARGER LES PRODUITS
  loadProducts(restaurantId: string) {
    this.apiService.getProductsByRestaurant(restaurantId).subscribe({
      next: (data) => {
        this.products = data;
      }
    });
  }

  // 2. SOUMETTRE (Ajout OU Modification)
  onSubmit() {
    if (this.productForm.invalid || !this.myRestaurant) return;
    this.isSubmitting = true;

    const productData: Product = this.productForm.value;
    // On s'assure que le restaurantId est bien celui du resto actuel
    if (this.myRestaurant.id != null) {
      productData.restaurantId = this.myRestaurant.id;
    }

    if (this.isEditing && this.editingProductId) {
      // --- LOGIQUE DE MISE À JOUR ---
      // NOTE: Il faut ajouter updateProduct dans ApiService (voir étape 3)
      // Pour l'instant, on va simuler ou tu devras l'ajouter
      console.log("Mise à jour de :", this.editingProductId);
      // TODO: Appel API update ici
      this.isSubmitting = false; // Temporaire

    } else {
      // --- LOGIQUE D'AJOUT ---
      this.apiService.addProduct(productData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.resetForm();
          this.loadProducts(this.myRestaurant!.id!); // Recharger la liste
        },
        error: () => this.isSubmitting = false
      });
    }
  }

  // 3. PRÉPARER L'ÉDITION
  editProduct(product: Product) {
    this.isEditing = true;
    this.editingProductId = product.id!; // L'ID Firestore

    // Remplir le formulaire avec les données du produit
    this.productForm.patchValue({
      name: product.name,
      price: product.price,
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl,
      restaurantId: product.restaurantId
    });

    // Scroll vers le haut (UX)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 4. ANNULER L'ÉDITION
  cancelEdit() {
    this.resetForm();
  }

  // 5. SUPPRIMER UN PRODUIT
  deleteProduct(id: string) {
    if(confirm('Voulez-vous vraiment supprimer ce plat ?')) {
      // NOTE: Il faut ajouter deleteProduct dans ApiService (voir étape 3)
      console.log("Suppression de :", id);
      // TODO: Appel API delete ici
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
