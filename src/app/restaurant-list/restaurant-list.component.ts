import { Component, OnInit } from '@angular/core'; // 👈 1. Vérifie que cet import est là
import { RestaurantService } from '../services/restaurant.service';
import { Restaurant } from '../models/restaurant.model';

// 👇 2. C'EST CE BLOC QUI MANQUE OU QUI EST MAL ÉCRIT
@Component({
  selector: 'app-restaurants-list',
  templateUrl: './restaurant-list.component.html'
})
export class RestaurantsListComponent implements OnInit {

  // Catégories
  categories = [
    { name: 'Tout', emoji: '🍽️' },
    { name: 'Burger', emoji: '🍔' },
    { name: 'Pizza', emoji: '🍕' },
    { name: 'Sushi', emoji: '🍣' },
    { name: 'Tacos', emoji: '🌮' },
    { name: 'Asiatique', emoji: '🍜' }
  ];

  selectedCategory: string = 'Tout';
  allRestaurants: Restaurant[] = [];
  displayedRestaurants: Restaurant[] = [];
  isLoading: boolean = true;

  constructor(private restaurantService: RestaurantService) {}

  ngOnInit() {
    this.restaurantService.getAllRestaurants().subscribe({
      next: (data: Restaurant[]) => {
        // Filtre pour ne garder que les actifs
        const activeRestos = data.filter(r => r.active === true);

        this.allRestaurants = activeRestos;
        this.displayedRestaurants = activeRestos;
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Erreur chargement restos :", err);
        this.isLoading = false;
      }
    });
  }

  filterRestaurants(categoryName: string) {
    this.selectedCategory = categoryName;

    if (categoryName === 'Tout') {
      this.displayedRestaurants = this.allRestaurants;
    } else {
      this.displayedRestaurants = this.allRestaurants.filter(resto => {
        // Vérification sécurisée (tags && ...)
        return resto.tags && resto.tags.some(tag => tag.includes(categoryName));
      });
    }
  }
}
