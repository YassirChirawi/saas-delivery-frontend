import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router'; // 👈 Importe Router

@Component({
  selector: 'app-restaurants-list',
  templateUrl: './restaurant-list.component.html',

})
export class RestaurantsListComponent implements OnInit {

  allRestaurants: any[] = [];
  filteredRestaurants: any[] = [];

  // 👇 NOUVEAU : Pour les filtres visuels
  categories: string[] = [];       // La liste de toutes les catégories (Sushi, Burger...)
  selectedCategory: string = '';   // La catégorie active (vide = tout afficher)

  searchTerm: string = '';
  isLoading: boolean = true;

  constructor(private api: ApiService,
              private router: Router) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;

    forkJoin({
      restos: this.api.getRestaurants(),
      products: this.api.getProducts()
    }).subscribe({
      next: (result) => {
        const { restos, products } = result;

        // 1. EXTRAIRE LES CATÉGORIES UNIQUES (Pour les boutons)
        // On récupère toutes les catégories non vides
        const allCats = products
          .map(p => p.category)
          .filter(c => c && c.trim() !== ''); // On enlève les vides

        // On utilise Set pour enlever les doublons (ex: 50 fois 'Burger')
        this.categories = [...new Set(allCats)].sort();


        // 2. ENRICHIR LES RESTAURANTS (Pour savoir qui vend quoi)
        this.allRestaurants = restos.map(resto => {
          const sesProduits = products.filter(p => p.restaurantId === resto.id);
          // On normalise en minuscule pour la comparaison
          const tags = [...new Set(sesProduits.map(p => p.category ? p.category.toLowerCase() : ''))];

          return { ...resto, tags };
        });

        this.filteredRestaurants = this.allRestaurants;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur', err);
        this.isLoading = false;
      }
    });
  }

  // 👇 ACTION : QUAND ON CLIQUE SUR UNE CATÉGORIE
  selectCategory(cat: string) {
    // Si on clique sur la catégorie déjà active, on la désactive (Toggle)
    if (this.selectedCategory === cat) {
      this.selectedCategory = '';
    } else {
      this.selectedCategory = cat;
    }

    this.applyFilters();
  }

  // 👇 ACTION : QUAND ON TAPE DANS LA BARRE DE RECHERCHE
  onSearchChange() {
    this.applyFilters();
  }

  // LOGIQUE CENTRALE DE FILTRAGE (Combine Recherche Texte + Catégorie)
  applyFilters() {
    let tempRestos = this.allRestaurants;

    // 1. Filtre par Catégorie (Boutons)
    if (this.selectedCategory) {
      const catFilter = this.selectedCategory.toLowerCase();
      tempRestos = tempRestos.filter(r => r.tags.includes(catFilter));
    }

    // 2. Filtre par Texte (Barre de recherche)
    if (this.searchTerm) {
      const textFilter = this.searchTerm.toLowerCase().trim();
      tempRestos = tempRestos.filter(r =>
        r.name.toLowerCase().includes(textFilter) ||
        r.tags.some((t: string) => t.includes(textFilter))
      );
    }

    this.filteredRestaurants = tempRestos;
  }
  // Ajoute cette méthode dans ta classe RestaurantsListComponent

  isOpen(resto: any): boolean {
    // 1. Si le switch manuel "isActive" est à false, c'est fermé d'office
    if (resto.isActive === false) return false;

    // 2. Si pas d'horaires définis, on considère ouvert par défaut (ou fermé, selon ton choix)
    if (!resto.openingTime || !resto.closingTime) return true;

    // 3. Récupérer l'heure actuelle
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // Convertir l'heure actuelle en minutes (ex: 14h30 = 14*60 + 30 = 870 min)
    const currentTimeInMinutes = currentHour * 60 + currentMin;

    // 4. Convertir les horaires du resto en minutes
    const [openH, openM] = resto.openingTime.split(':').map(Number);
    const [closeH, closeM] = resto.closingTime.split(':').map(Number);

    const openTimeInMinutes = openH * 60 + openM;
    const closeTimeInMinutes = closeH * 60 + closeM;

    // 5. Comparaison
    // Cas classique : Ouvre à 11h, Ferme à 23h
    if (closeTimeInMinutes > openTimeInMinutes) {
      return currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes;
    }
    // Cas de nuit : Ouvre à 18h, Ferme à 02h du matin
    else {
      return currentTimeInMinutes >= openTimeInMinutes || currentTimeInMinutes < closeTimeInMinutes;
    }
  }
  testClick(id: string) {
    console.log('CLICK DÉTECTÉ ! ID:', id);
    // Si tu vois le log, force la navigation manuellement :
    this.router.navigate(['/shop', id]);
  }
}
