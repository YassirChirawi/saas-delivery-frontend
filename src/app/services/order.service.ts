import { Injectable } from '@angular/core';
import {
  getFirestore, collection, addDoc, doc, onSnapshot,
  query, where, orderBy, updateDoc
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private app = initializeApp(environment.firebase);
  private db = getFirestore(this.app);

  constructor() { }

  // --- 1. CRÉATION (Côté Client) ---
  async createOrder(orderData: any): Promise<string> {
    const ordersRef = collection(this.db, 'orders');

    const finalOrder = {
      ...orderData,
      status: 'PENDING', // Statut initial
      createdAt: new Date().toISOString(),
      createdAtTimestamp: Date.now() // Pour le tri
    };

    const docRef = await addDoc(ordersRef, finalOrder);
    return docRef.id;
  }

  // --- 2. LECTURE CLIENT (Tracking Unitaire) ---
  getOrderRealtime(orderId: string): Observable<any> {
    return new Observable((observer) => {
      const docRef = doc(this.db, 'orders', orderId);
      const unsubscribe = onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
          observer.next({ id: doc.id, ...doc.data() });
        } else {
          observer.error("Commande introuvable");
        }
      });
      return () => unsubscribe();
    });
  }

  // --- 3. LECTURE RESTAURATEUR (Dashboard Temps Réel) ---
  getOrdersByRestaurant(restaurantId: string): Observable<any[]> {
    return new Observable((observer) => {
      const ordersRef = collection(this.db, 'orders');

      // On veut les commandes de CE restaurant, triées par date (récentes en haut)
      const q = query(
        ordersRef,
        where('restaurantId', '==', restaurantId),
        orderBy('createdAtTimestamp', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        observer.next(orders);
      }, (error) => {
        console.error("Erreur récupération commandes:", error);
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  // --- 4. ACTION RESTAURATEUR (Changer statut) ---
  async updateStatus(orderId: string, newStatus: string): Promise<void> {
    const orderRef = doc(this.db, 'orders', orderId);
    await updateDoc(orderRef, {
      status: newStatus
    });
  }

  // --- 5. UTILITAIRE (Message WhatsApp) ---
  formatWhatsAppMessage(order: any, orderId: string): string {
    let message = `🛒 *COMMANDE #${orderId.slice(0, 5).toUpperCase()}*\n`;
    message += `👤 Nom : ${order.clientName}\n`;
    message += `📞 Tel : ${order.clientPhone}\n`;

    if (order.deliveryOption === 'delivery') {
      message += `🏠 *LIVRAISON* : ${order.clientAddress}\n`;
    } else {
      message += `🚶 *À EMPORTER*\n`;
    }

    message += `\n📋 *Détail :*\n`;
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        message += `▫️ ${item.quantity}x ${item.name} (${item.price * item.quantity}€)\n`;
      });
    }

    if (order.note) message += `\n📝 Note : ${order.note}`;
    message += `\n💰 *TOTAL : ${order.total} €*`;
    message += `\n📍 Restaurant : ${order.restaurantName}`;

    return message;
  }
}
