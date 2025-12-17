import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { Restaurant } from '../models/restaurant.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // 1. URL DE BASE (Attention, elle s'arrête à /api/v1)
  private baseUrl = environment.apiUrl;

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

  getRestaurantByEmail(email: string): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${this.baseUrl}/restaurants/owner/${email}`);
  }

  // Update
  updateProduct(id: string, product: Product): Observable<any> {
    return this.http.put(`${this.baseUrl}/products/${id}`, product);
  }

  // Delete
  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/products/${id}`, { responseType: 'text' });
  }

  // Ajouter une demande de partenariat
  addPartnerRequest(request: any): Observable<any> {
    request.status = 'PENDING';

    // 👇 AJOUTE LE 3ème ARGUMENT ICI : { responseType: 'text' }
    return this.http.post(`${this.baseUrl}/requests`, request, { responseType: 'text' });
  }

  // Récupérer les demandes
  getRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/requests`);
  }

  // Supprimer une demande
  deleteRequest(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/requests/${id}`, { responseType: 'text' });
  }

  updateRestaurant(id: string, restaurant: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/restaurants/${id}`, restaurant, { responseType: 'text' });
  }

  // Supprimer un restaurant (La méthode qui te manque)
  deleteRestaurant(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/restaurants/${id}`, { responseType: 'text' });
  }

  addToFavoritesCloud(userId: string, restaurantId: string) {
    // Appel HTTP vers ton Backend Spring Boot
    return this.http.post(`${this.baseUrl}/users/${userId}/favorites`, { restaurantId });
  }

  createOrder(orderData: any): Observable<any> {
    // Note : On ajoute { responseType: 'text' } car ton Backend renvoie juste un ID (String)
    // et pas un objet JSON complet. Sinon Angular va essayer de parser et fera une erreur.
    return this.http.post(`${this.baseUrl}/orders`, orderData, { responseType: 'text' });
  }
}
