import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs'; // 👈 Ajout de 'of'
import { switchMap, map } from 'rxjs/operators'; // 👈 Ajout des opérateurs RxJS
import { Product } from '../models/product.model';
import { Restaurant } from '../models/restaurant.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // --- PRODUITS ---

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/products`);
  }

  getProductsByRestaurant(restaurantId: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/products/restaurant/${restaurantId}`);
  }

  /**
   * MODIFICATION ICI :
   * On ajoute le produit, PUIS on met à jour les tags du restaurant automatiquement.
   */
  addProduct(product: Product): Observable<any> {
    // 1. On lance la requête pour ajouter le produit
    return this.http.post(`${this.baseUrl}/products`, product, { responseType: 'text' }).pipe(

      // 2. On enchaîne (switchMap) pour gérer les tags du restaurant
      switchMap((originalResponse) => {

        // Si le produit n'a pas de catégorie ou d'ID de restaurant, on ne fait rien de plus
        if (!product.category || !product.restaurantId) {
          return of(originalResponse);
        }

        // 3. On récupère le restaurant actuel pour voir ses tags
        return this.getRestaurantById(product.restaurantId).pipe(
          switchMap((restaurant) => {

            // On s'assure que le tableau tags existe
            const currentTags = restaurant.tags || [];
            const newCategory = product.category.toLowerCase(); // On met en minuscule

            // 4. Si la catégorie n'est PAS dans les tags, on l'ajoute
            if (!currentTags.includes(newCategory)) {

              // On crée la nouvelle liste de tags
              const updatedTags = [...currentTags, newCategory];

              // On crée un objet restaurant mis à jour (on garde tout, on change juste les tags)
              const updatedRestaurant = { ...restaurant, tags: updatedTags };

              // 5. On envoie la mise à jour au serveur
              return this.updateRestaurant(product.restaurantId, updatedRestaurant).pipe(
                // À la fin, on renvoie la réponse originale de la création du produit
                map(() => originalResponse)
              );
            }

            // Si le tag existait déjà, on ne fait rien et on renvoie la réponse originale
            return of(originalResponse);
          })
        );
      })
    );
  }

  // --- RESTAURANTS ---

  getRestaurants(): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>(`${this.baseUrl}/restaurants`);
  }

  getRestaurantById(id: string): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${this.baseUrl}/restaurants/${id}`);
  }

  createRestaurant(restaurant: Restaurant): Observable<any> {
    return this.http.post(`${this.baseUrl}/restaurants`, restaurant, { responseType: 'text' });
  }

  toggleRestaurantStatus(id: string, status: boolean): Observable<any> {
    return this.http.put(`${this.baseUrl}/restaurants/${id}/activate?status=${status}`, {});
  }

  getRestaurantByEmail(email: string): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${this.baseUrl}/restaurants/owner/${email}`);
  }

  // Update Product
  updateProduct(id: string, product: Product): Observable<any> {
    return this.http.put(`${this.baseUrl}/products/${id}`, product);
  }

  // Delete Product
  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/products/${id}`, { responseType: 'text' });
  }

  // --- PARTENARIATS ---

  addPartnerRequest(request: any): Observable<any> {
    request.status = 'PENDING';
    return this.http.post(`${this.baseUrl}/requests`, request, { responseType: 'text' });
  }

  getRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/requests`);
  }

  deleteRequest(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/requests/${id}`, { responseType: 'text' });
  }

  // Update Restaurant
  updateRestaurant(id: string, restaurant: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/restaurants/${id}`, restaurant, { responseType: 'text' });
  }

  // Delete Restaurant
  deleteRestaurant(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/restaurants/${id}`, { responseType: 'text' });
  }

  // --- FAVORIS & COMMANDES ---

  addToFavoritesCloud(userId: string, restaurantId: string) {
    return this.http.post(`${this.baseUrl}/users/${userId}/favorites`, { restaurantId });
  }

  createOrder(orderData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/orders`, orderData, { responseType: 'text' });
  }
}
