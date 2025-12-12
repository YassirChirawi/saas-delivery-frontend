import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms'; // Pour le formulaire
import { ApiService } from '../services/api.service';
import { Restaurant } from '../models/restaurant.model';

@Component({
  selector: 'app-super-admin',
  templateUrl: './super-admin.component.html'
})
export class SuperAdminComponent implements OnInit {
  restaurants: Restaurant[] = [];
  restoForm: FormGroup;
  isLoading = false;

  constructor(
    private apiService: ApiService,
    private fb: FormBuilder
  ) {
    // Initialisation du formulaire
    this.restoForm = this.fb.group({
      name: ['', Validators.required],
      id: ['', Validators.required], // C'est le "slug" (ex: pizza-king)
      ownerName: ['', Validators.required],
      whatsappPhone: ['', Validators.required],
      active: [true] // Activé par défaut à la création
    });
  }

  ngOnInit(): void {
    this.loadRestaurants();
  }

  // Charger la liste depuis le backend
  loadRestaurants() {
    this.apiService.getRestaurants().subscribe({
      next: (data) => this.restaurants = data,
      error: (err) => console.error('Erreur chargement restos', err)
    });
  }

  // Créer un nouveau restaurant
  onSubmit() {
    if (this.restoForm.invalid) return;
    this.isLoading = true;

    const newResto: Restaurant = this.restoForm.value;

    this.apiService.createRestaurant(newResto).subscribe({
      next: () => {
        alert('Restaurant créé avec succès ! 🏢');
        this.loadRestaurants(); // Rafraîchir la liste
        this.restoForm.reset({ isActive: true }); // Reset form
        this.isLoading = false;
      },
      error: (err) => {
        alert('Erreur lors de la création');
        this.isLoading = false;
      }
    });
  }

  // Activer / Bloquer un restaurant
  toggleStatus(resto: Restaurant) {
    // 1. On calcule le nouvel état (l'inverse de l'actuel)
    const newStatus = !resto.active; // Remplace isActive
    resto.active = newStatus;

    // 3. Envoi au Backend
    this.apiService.toggleRestaurantStatus(resto.id, newStatus).subscribe({
      next: () => {
        console.log(`Statut mis à jour pour ${resto.name} : ${newStatus}`);
      },
      error: (err) => {
        // Si ça plante, on revient en arrière visuellement et on alerte
        console.error('Erreur update statut', err);
        resto.active = !newStatus;
        alert("Impossible de sauvegarder le changement !");
      }
    });
  }

  // Petit helper pour générer l'ID automatiquement quand on tape le nom
  // Ex: "Chez Mario" -> "chez-mario"
  generateSlug() {
    const name = this.restoForm.get('name')?.value;
    if (name) {
      const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      this.restoForm.get('id')?.setValue(slug);
    }
  }
}
