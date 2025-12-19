import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product } from '../models/product.model';

// 1. On sécurise l'interface : un item du panier a OBLIGATOIREMENT un ID (string)
export interface CartItem extends Product {
  quantity: number;
  id: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {

  private cartItems = new BehaviorSubject<CartItem[]>([]);
  cart$ = this.cartItems.asObservable();

  private deliveryFee = 0;

  constructor() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      this.cartItems.next(JSON.parse(savedCart));
    }
  }

  /**
   * Ajoute un produit au panier.
   */
  addToCart(product: Product): boolean {
    const currentItems = this.cartItems.value;

    // A. Restriction 1 seul restaurant
    if (currentItems.length > 0) {
      const currentRestoId = currentItems[0].restaurantId;
      if (product.restaurantId !== currentRestoId) {
        return false;
      }
    }

    // B. Gestion Quantité
    // On utilise "|| ''" pour éviter l'erreur si product.id est undefined
    const safeId = product.id || '';
    const existingItem = currentItems.find(item => item.id === safeId);

    if (existingItem) {
      existingItem.quantity += 1;
      this.updateCart([...currentItems]);
    } else {
      // C. Création propre du CartItem sans erreur de type
      const newItem: CartItem = {
        ...product,
        id: safeId, // On force l'ID à être une string
        quantity: 1
      };
      this.updateCart([...currentItems, newItem]);
    }

    return true;
  }

  /**
   * Supprime un article via son ID
   */
  removeFromCart(productId: string) {
    const currentItems = this.cartItems.value;
    const filteredItems = currentItems.filter(item => item.id !== productId);
    this.updateCart(filteredItems);
  }

  /**
   * Met à jour la quantité.
   * Accepte "undefined" pour ne pas faire planter l'HTML, mais le gère proprement.
   */
  updateQuantity(productId: string | undefined, quantity: number) {
    // Sécurité : Si pas d'ID, on ne fait rien
    if (!productId) return;

    let currentItems = this.cartItems.value;
    const item = currentItems.find(i => i.id === productId);

    if (item) {
      item.quantity = quantity;

      // Si on arrive à 0, on supprime l'article
      if (item.quantity <= 0) {
        this.removeFromCart(productId);
        return;
      }
    }
    this.updateCart([...currentItems]);
  }

  // --- FRAIS & TOTAL ---

  setDeliveryFee(fee: number) {
    this.deliveryFee = fee;
    this.cartItems.next(this.cartItems.value);
  }

  getDeliveryFee(): number {
    return this.deliveryFee;
  }

  getTotalPrice(): number {
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
    this.updateCart([]);
  }

  private updateCart(items: CartItem[]) {
    this.cartItems.next(items);
    localStorage.setItem('cart', JSON.stringify(items));
  }
}
