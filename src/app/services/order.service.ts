import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  getFirestore, collection, addDoc, doc, onSnapshot,
  query, where, orderBy, updateDoc, Firestore
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = 'http://localhost:8080/api/v1/orders'; // Adjust based on actual base URL if needed
  private promoUrl = 'http://localhost:8080/api/v1/promo-codes';
  private db: Firestore;

  constructor(private http: HttpClient) {
    const app = initializeApp(environment.firebase);
    this.db = getFirestore(app);
  }

  // --- 1. CRÉATION (Via Backend Spring Boot) ---
  createOrder(orderData: any): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http.post(this.apiUrl, orderData, { responseType: 'text' }).subscribe({
        next: (id) => resolve(id),
        error: (err) => reject(err)
      });
    });
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

  getOrdersByUser(userId: string): Observable<any[]> {
    return new Observable((observer) => {
      const ordersRef = collection(this.db, 'orders');

      // On veut les commandes de l'utilisateur X, triées par date
      const q = query(
        ordersRef,
        where('userId', '==', userId),
        orderBy('createdAtTimestamp', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        observer.next(orders);
      });

      return () => unsubscribe();
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

  verifyPromoCode(code: string, amount: number): Observable<any> {
    return this.http.post(`${this.promoUrl}/verify`, { code, amount });
  }
}


