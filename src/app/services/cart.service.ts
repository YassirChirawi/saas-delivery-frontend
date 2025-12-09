import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems = new BehaviorSubject<Product[]>([]);
  cart$ = this.cartItems.asObservable();

  // NOUVEAU : Gestion de la livraison
  private deliveryFee = 0; // 0€ par défaut (Pick-up)

  addToCart(product: Product) {
    const currentItems = this.cartItems.value;
    this.cartItems.next([...currentItems, product]);
  }

  getCartItems(): Product[] {
    return this.cartItems.value;
  }

  // NOUVEAU : Permet de définir les frais
  setDeliveryFee(fee: number) {
    this.deliveryFee = fee;
    // On déclenche une mise à jour pour que le composant recalcule le total
    this.cartItems.next(this.cartItems.value);
  }

  getDeliveryFee(): number {
    return this.deliveryFee;
  }

  // Mise à jour du calcul total
  getTotalPrice(): number {
    const productsTotal = this.cartItems.value.reduce((total, item) => total + item.price, 0);
    return productsTotal + this.deliveryFee;
  }

  clearCart() {
    this.cartItems.next([]);
    this.deliveryFee = 0;
  }
}
