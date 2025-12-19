import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product } from '../models/product.model';

// On crée une interface étendue pour gérer la quantité
export interface CartItem extends Product {
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {

  // On stocke des CartItem (avec quantité) et non plus juste des Product
  private cartItems = new BehaviorSubject<CartItem[]>([]);
  cart$ = this.cartItems.asObservable();

  private deliveryFee = 0; // 0€ par défaut (Pick-up)

  constructor() {
    // AU DÉMARRAGE : On récupère le panier sauvegardé dans le téléphone/navigateur
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      this.cartItems.next(JSON.parse(savedCart));
    }
  }

  /**
   * Ajoute un produit au panier.
   * @returns true si ajouté, false si conflit de restaurant (Bloqué)
   */
  addToCart(product: Product): boolean {
    const currentItems = this.cartItems.value;

    // 1. VÉRIFICATION : RESTRICTION 1 SEUL RESTAURANT
    if (currentItems.length > 0) {
      const currentRestoId = currentItems[0].restaurantId;
      // Si le produit vient d'un autre resto, on bloque
      if (product.restaurantId !== currentRestoId) {
        return false;
      }
    }

    // 2. GESTION DE LA QUANTITÉ
    const existingItem = currentItems.find(item => item.id === product.id);

    if (existingItem) {
      // Si le produit existe déjà, on augmente la quantité
      existingItem.quantity += 1;
      // On force la mise à jour du tableau pour que Angular détecte le changement
      this.updateCart([...currentItems]);
    } else {
      // Sinon, on l'ajoute avec quantité 1
      const newItem: CartItem = { ...product, quantity: 1 };
      this.updateCart([...currentItems, newItem]);
    }

    return true; // Succès
  }

  // NOUVEAU : Supprimer un article (Poubelle)
  removeFromCart(productId: string) {
    const currentItems = this.cartItems.value;
    const filteredItems = currentItems.filter(item => item.id !== productId);
    this.updateCart(filteredItems);
  }

  // NOUVEAU : Modifier la quantité (+ ou -)
  updateQuantity(productId: string, quantity: number) {
    let currentItems = this.cartItems.value;
    const item = currentItems.find(i => i.id === productId);

    if (item) {
      item.quantity = quantity;
      if (item.quantity <= 0) {
        this.removeFromCart(productId); // Si 0, on supprime
        return;
      }
    }
    this.updateCart([...currentItems]);
  }

  // --- GESTION DES FRAIS & TOTAL ---

  setDeliveryFee(fee: number) {
    this.deliveryFee = fee;
    // On réémet le panier pour forcer le recalcul du total dans les composants
    this.cartItems.next(this.cartItems.value);
  }

  getDeliveryFee(): number {
    return this.deliveryFee;
  }

  getTotalPrice(): number {
    // Calcul : (Prix x Quantité) de chaque item + Livraison
    const productsTotal = this.cartItems.value.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    return productsTotal + this.deliveryFee;
  }

  // --- UTILITAIRES ---

  getCartItems(): CartItem[] {
    return this.cartItems.value;
  }

  clearCart() {
    this.deliveryFee = 0;
    this.updateCart([]); // Vide le tableau et le localStorage
  }

  // Méthode privée pour mettre à jour le Subject ET le LocalStorage en même temps
  private updateCart(items: CartItem[]) {
    this.cartItems.next(items);
    localStorage.setItem('cart', JSON.stringify(items));
  }
}
