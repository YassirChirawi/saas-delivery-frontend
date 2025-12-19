import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot // 👈 C'est lui qui remplace collectionData pour le temps réel
} from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { Restaurant } from '../models/restaurant.model';
import { Observable, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RestaurantService {

  // 1. Initialisation MANUELLE (Comme ton AuthService)
  private app = initializeApp(environment.firebase);
  private db = getFirestore(this.app);

  constructor() {}

  // --- CRUD RESTAURANTS ---

  // 1. Créer un restaurant
  createRestaurant(resto: Restaurant): Observable<any> {
    const restoRef = collection(this.db, 'restaurants');
    return from(addDoc(restoRef, resto));
  }

  // 2. Récupérer tous les restaurants (TEMPS RÉEL)
  // On recrée manuellement la logique de collectionData
  getRestaurants(): Observable<Restaurant[]> {
    const restoRef = collection(this.db, 'restaurants');

    return new Observable((observer) => {
      // onSnapshot écoute la base de données en permanence
      const unsubscribe = onSnapshot(restoRef, (snapshot) => {
        const restaurants = snapshot.docs.map(doc => ({
          id: doc.id, // On récupère l'ID manuellement
          ...doc.data() as any
        })) as Restaurant[];

        observer.next(restaurants); // On envoie les données à Angular
      }, (error) => {
        observer.error(error);
      });

      // Fonction de nettoyage quand le composant est détruit
      return () => unsubscribe();
    });
  }

  // 3. Mettre à jour
  updateRestaurant(id: string, data: Partial<Restaurant>): Observable<void> {
    const docRef = doc(this.db, 'restaurants', id);
    return from(updateDoc(docRef, data));
  }

  getAllRestaurants(): Observable<Restaurant[]> {
    // 1. Référence à la collection
    const restoRef = collection(this.db, 'restaurants');

    // 2. On crée un Observable manuellement
    return new Observable((observer) => {

      // 3. onSnapshot écoute la BDD en temps réel
      const unsubscribe = onSnapshot(restoRef,
        (snapshot) => {
          // On transforme les documents bruts en objets Restaurant
          const restaurants = snapshot.docs.map(doc => ({
            id: doc.id,             // On récupère l'ID du document
            ...doc.data() as any    // On récupère les données (name, email...)
          })) as Restaurant[];

          // On envoie la nouvelle liste à Angular
          observer.next(restaurants);
        },
        (error) => {
          observer.error(error);
        }
      );

      // 4. Fonction de nettoyage (arrête d'écouter quand on quitte la page)
      return () => unsubscribe();
    });
  }

  // 4. Supprimer
  deleteRestaurant(id: string): Observable<void> {
    const docRef = doc(this.db, 'restaurants', id);
    return from(deleteDoc(docRef));
  }


}
