import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-restaurants-list',
  templateUrl: './restaurant-list.component.html',
})
export class RestaurantsListComponent implements OnInit {

  allRestaurants: any[] = [];
  filteredRestaurants: any[] = [];

  // Filtres visuels
  categories: string[] = [];
  selectedCategory: string = '';
  searchTerm: string = '';
  isLoading: boolean = true;

  constructor(private api: ApiService,
              private router: Router) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;

    // On charge Restos ET Produits en parallèle pour générer les tags
    forkJoin({
      restos: this.api.getRestaurants(), // Assure-toi que cette méthode existe (ou getAllRestaurants)
      products: this.api.getProducts()
    }).subscribe({
      next: (result) => {
        const { restos, products } = result;

        // 1. EXTRAIRE LES CATÉGORIES UNIQUES
        const allCats = products
          .map(p => p.category)
          .filter(c => c && c.trim() !== '');

        this.categories = [...new Set(allCats)].sort();

        // 2. ENRICHIR LES RESTAURANTS (Tags)
        this.allRestaurants = restos.map(resto => {
          const sesProduits = products.filter(p => p.restaurantId === resto.id);
          const tags = [...new Set(sesProduits.map(p => p.category ? p.category.toLowerCase() : ''))];
          return { ...resto, tags };
        });

        this.filteredRestaurants = this.allRestaurants;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement', err);
        this.isLoading = false;
      }
    });
  }

  // --- FILTRES ---

  selectCategory(cat: string) {
    if (this.selectedCategory === cat) {
      this.selectedCategory = ''; // Toggle OFF
    } else {
      this.selectedCategory = cat; // Toggle ON
    }
    this.applyFilters();
  }

  onSearchChange() {
    this.applyFilters();
  }

  applyFilters() {
    let tempRestos = this.allRestaurants;

    // 1. Filtre Catégorie
    if (this.selectedCategory) {
      const catFilter = this.selectedCategory.toLowerCase();
      tempRestos = tempRestos.filter(r => r.tags.includes(catFilter));
    }

    // 2. Filtre Texte
    if (this.searchTerm) {
      const textFilter = this.searchTerm.toLowerCase().trim();
      tempRestos = tempRestos.filter(r =>
        r.name.toLowerCase().includes(textFilter) ||
        r.tags.some((t: string) => t.includes(textFilter))
      );
    }

    this.filteredRestaurants = tempRestos;
  }

  // --- NAVIGATION ---

  goToShop(id: string) {
    this.router.navigate(['/shop', id]);
  }

  // --- LOGIQUE D'OUVERTURE (MISE À JOUR) ---

  isRestoOpen(restaurant: any): boolean {
    // 1. Si pas d'horaires définis, on considère ouvert
    if (!restaurant.openingHours) return true;

    const now = new Date();
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = dayKeys[now.getDay()];

    const schedule = restaurant.openingHours[todayKey];

    // 2. Si fermé ce jour-là
    if (!schedule || schedule.closed) return false;

    // 3. Comparaison de l'heure
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    return currentTimeStr >= schedule.open && currentTimeStr < schedule.close;
  }

  getStatusLabel(restaurant: any): string {
    return this.isRestoOpen(restaurant) ? 'Ouvert 🟢' : 'Fermé 🔴';
  }
}
