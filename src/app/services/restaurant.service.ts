import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,        // 👈 Nouveau : Pour préparer la requête
  where,        // 👈 Nouveau : Pour le filtre (Where tags contains...)
  getDocs       // 👈 Nouveau : Pour récupérer le résultat de la recherche
} from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { Restaurant } from '../models/restaurant.model'; // Vérifie que ce chemin est bon
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RestaurantService {

  // 1. Initialisation
  private app = initializeApp(environment.firebase);
  private db = getFirestore(this.app);

  constructor() {}

  // ==========================================
  // 1. CREATE (Créer un restaurant)
  // ==========================================
  createRestaurant(resto: Restaurant): Observable<any> {
    const restoRef = collection(this.db, 'restaurants');
    // On ajoute un tableau de tags vide par défaut si on l'a oublié, pour éviter les bugs
    const dataToSave = {
      ...resto,
      tags: resto.tags || []
    };
    return from(addDoc(restoRef, dataToSave));
  }

  // ==========================================
  // 2. READ (Tout récupérer en TEMPS RÉEL)
  // ==========================================
  getRestaurants(): Observable<Restaurant[]> {
    const restoRef = collection(this.db, 'restaurants');

    return new Observable((observer) => {
      // onSnapshot écoute la BDD en permanence
      const unsubscribe = onSnapshot(restoRef, (snapshot) => {
        const restaurants = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as any
        })) as Restaurant[];

        observer.next(restaurants);
      }, (error) => {
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  // ==========================================
  // 3. FILTER (Recherche serveur - Optionnel)
  // ==========================================
  // Utile si tu as trop de restaurants pour filtrer en Javascript
  filterRestaurantsByTag(tagName: string): Observable<Restaurant[]> {
    const restoRef = collection(this.db, 'restaurants');
    const term = tagName.toLowerCase().trim();

    // Requête : Cherche les restos où le tableau 'tags' contient 'term'
    const q = query(restoRef, where('tags', 'array-contains', term));

    // Note: Pour une recherche, on fait souvent un appel unique (getDocs)
    // plutôt qu'un temps réel (onSnapshot) pour économiser les quotas.
    return from(getDocs(q)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as any
        })) as Restaurant[];
      })
    );
  }

  // ==========================================
  // 4. UPDATE (Mettre à jour)
  // ==========================================
  updateRestaurant(id: string, data: Partial<Restaurant>): Observable<void> {
    const docRef = doc(this.db, 'restaurants', id);
    return from(updateDoc(docRef, data));
  }

  // ==========================================
  // 5. DELETE (Supprimer)
  // ==========================================
  deleteRestaurant(id: string): Observable<void> {
    const docRef = doc(this.db, 'restaurants', id);
    return from(deleteDoc(docRef));
  }
}
