import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service'; // 👈 Import Auth
import { Restaurant } from '../models/restaurant.model';
import { Product } from '../models/product.model';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html'
})
export class AdminComponent implements OnInit {
  productForm: FormGroup;
  isSubmitting = false;
  successMessage = '';

  // On ne stocke plus une liste, mais UN SEUL resto (le mien)
  myRestaurant: Restaurant | null = null;
  currentUserEmail: string | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private auth: AuthService // 👈 Injection Auth
  ) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      category: ['BURGER', Validators.required],
      description: ['', Validators.required],
      imageUrl: [''],
      restaurantId: ['', Validators.required] // Toujours requis, mais rempli auto
    });
  }

  ngOnInit() {
    // 1. Qui est connecté ?
    this.currentUserEmail = this.auth.getCurrentEmail();

    if (this.currentUserEmail) {
      console.log("🔍 Recherche du restaurant pour :", this.currentUserEmail);

      // 2. Chercher MON restaurant
      this.apiService.getRestaurantByEmail(this.currentUserEmail).subscribe({
        next: (resto) => {
          if (resto) {
            this.myRestaurant = resto;
            console.log("✅ Restaurant trouvé :", resto.name);

            // 3. Verrouiller le formulaire sur cet ID
            this.productForm.patchValue({ restaurantId: resto.id });
          } else {
            console.warn("⚠️ Aucun restaurant associé à cet email !");
          }
        },
        error: (err) => console.error(err)
      });
    }
  }

  onSubmit() {
    if (this.productForm.invalid) return;
    this.isSubmitting = true;

    // On s'assure que l'ID est bien celui du resto chargé
    if (this.myRestaurant) {
      this.productForm.patchValue({ restaurantId: this.myRestaurant.id });
    }

    const newProduct: Product = this.productForm.value;

    this.apiService.addProduct(newProduct).subscribe({
      next: () => {
        this.successMessage = 'Produit ajouté avec succès ! 🚀';
        this.isSubmitting = false;
        // Reset sans effacer l'ID du resto
        this.productForm.reset({
          category: 'BURGER',
          restaurantId: this.myRestaurant?.id,
          price: 0,
          imageUrl: ''
        });
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => {
        this.isSubmitting = false;
        alert('Erreur technique');
      }
    });

  }
  logout() {
    this.auth.logout();
  }
}
