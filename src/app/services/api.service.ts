import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { Restaurant } from '../models/restaurant.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // 1. URL DE BASE (Attention, elle s'arrête à /api/v1)
  private baseUrl = 'http://localhost:8080/api/v1';

  constructor(private http: HttpClient) {}

  // --- PRODUITS ---

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/products`);
  }

  // Correction ici aussi au cas où :
  getProductsByRestaurant(restaurantId: string): Observable<Product[]> {
    // URL voulue : .../api/v1/products/restaurant/{id}
    return this.http.get<Product[]>(`${this.baseUrl}/products/restaurant/${restaurantId}`);
  }

  addProduct(product: Product): Observable<any> {
    return this.http.post(`${this.baseUrl}/products`, product, { responseType: 'text' });
  }

  // --- RESTAURANTS ---

  getRestaurants(): Observable<Restaurant[]> {
    // URL voulue : .../api/v1/restaurants
    return this.http.get<Restaurant[]>(`${this.baseUrl}/restaurants`);
  }

  // 👇 C'EST ICI QUE TU AVAIS L'ERREUR 👇
  getRestaurantById(id: string): Observable<Restaurant> {
    // URL voulue : .../api/v1/restaurants/{id}
    // AVANT (Erreur) : `${this.baseUrl}/restaurants/restaurants/${id}` ou conflit avec baseUrl

    // APRÈS (Correction) :
    return this.http.get<Restaurant>(`${this.baseUrl}/restaurants/${id}`);
  }

  // ... le reste (createRestaurant, toggleRestaurantStatus) reste inchangé
  createRestaurant(restaurant: Restaurant): Observable<any> {
    return this.http.post(`${this.baseUrl}/restaurants`, restaurant, { responseType: 'text' });
  }

  toggleRestaurantStatus(id: string, status: boolean): Observable<any> {
    return this.http.put(`${this.baseUrl}/restaurants/${id}/activate?status=${status}`, {});
  }
}
