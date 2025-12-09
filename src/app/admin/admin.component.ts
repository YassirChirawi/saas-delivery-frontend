import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Product } from '../models/product.model';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html'
})
export class AdminComponent {
  productForm: FormGroup;
  isSubmitting = false;
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService
  ) {
    // Initialisation simplifiée sans gestion de fichier
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      category: ['BURGER', Validators.required],
      description: ['', Validators.required],
      imageUrl: [''], // Champ simple string
      restaurantId: ['resto_01']
    });
  }

  onSubmit() {
    if (this.productForm.invalid) return;

    this.isSubmitting = true;

    // On envoie directement les valeurs du formulaire
    const newProduct: Product = this.productForm.value;

    this.apiService.addProduct(newProduct).subscribe({
      next: () => {
        this.successMessage = 'Produit ajouté avec succès ! 🚀';
        this.isSubmitting = false;

        // On remet à zéro
        this.productForm.reset({
          category: 'BURGER',
          restaurantId: 'resto_01',
          price: 0,
          imageUrl: ''
        });

        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error(err);
        this.isSubmitting = false;
        alert('Erreur lors de la sauvegarde');
      }
    });
  }
}
