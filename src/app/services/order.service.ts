import { Injectable } from '@angular/core';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  onSnapshot
} from 'firebase/firestore'; // 👈 Imports Firebase
import { initializeApp } from 'firebase/app';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  // Initialisation de la BDD
  private app = initializeApp(environment.firebase);
  private db = getFirestore(this.app);

  constructor() { }

  // 1. SAUVEGARDER LA COMMANDE DANS FIREBASE
  // On renvoie une "Promise" qui contient l'ID de la commande créée
  async createOrder(orderData: any): Promise<string> {
    const ordersRef = collection(this.db, 'orders');

    // On ajoute des champs techniques (Date, Statut)
    const finalOrder = {
      ...orderData,
      status: 'PENDING', // En attente
      createdAt: new Date().toISOString(),
      createdAtTimestamp: Date.now() // Pour trier plus facilement
    };

    // Firebase crée le document et nous donne la référence
    const docRef = await addDoc(ordersRef, finalOrder);
    return docRef.id; // On retourne l'ID (ex: "7dh3s8d...") pour le suivi
  }

  // 2. SUIVRE UNE COMMANDE EN TEMPS RÉEL (Pour le futur écran de tracking)
  getOrderRealtime(orderId: string): Observable<any> {
    return new Observable((observer) => {
      const docRef = doc(this.db, 'orders', orderId);

      // onSnapshot = Écoute permanente. Si le restau change le statut, ça se met à jour ici.
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

  // 3. GÉNÉRER LE TEXTE WHATSAPP
  // On sort ça du Component pour garder le code propre
  formatWhatsAppMessage(order: any, orderId: string): string {
    let message = `🛒 *NOUVELLE COMMANDE #${orderId.slice(0, 5).toUpperCase()}*\n`;

    // Infos Client
    message += `👤 Nom : ${order.clientName}\n`;
    message += `📞 Tel : ${order.clientPhone}\n`;

    // Infos Livraison
    if (order.deliveryOption === 'delivery') {
      message += `🏠 *LIVRAISON* : ${order.clientAddress}\n`;
    } else {
      message += `🚶 *À EMPORTER*\n`;
    }

    message += `\n📋 *Détail de la commande :*\n`;

    // Liste des produits
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        message += `▫️ ${item.quantity}x ${item.name} (${item.price * item.quantity}€)\n`;
      });
    }

    // Note et Total
    if (order.note) message += `\n📝 Note : ${order.note}`;
    message += `\n💰 *TOTAL : ${order.total} €*`;
    message += `\n📍 Restaurant : ${order.restaurantName}`;

    return message;
  }
}
