import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  User,
  UserCredential
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'; // 👈 INDISPENSABLE POUR LE PROFIL
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { collection, query, where, getDocs } from 'firebase/firestore'; // 👈 Ajoute ces imports

// Définition des Rôles
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  RESTAURANT_ADMIN = 'RESTAURANT_ADMIN',
  CLIENT = 'CLIENT'
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  restaurantId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private app = initializeApp(environment.firebase);
  private auth = getAuth(this.app);
  private db = getFirestore(this.app); // 👈 Initialisation de la BDD

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  user$ = this.currentUserSubject.asObservable();

  constructor(private router: Router) {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUserSubject.next(user);
    });
  }

  // 1. LOGIN : On renvoie explicitement un UserCredential (le paquet complet)
  async login(email: string, pass: string): Promise<UserCredential> {
    return await signInWithEmailAndPassword(this.auth, email, pass);
  }

  // 2. LOGOUT
  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  // 3. RÉCUPÉRER LE PROFIL (C'est la méthode qu'il te manquait !)
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(this.db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      } else {
        console.warn("⚠️ Utilisateur connecté, mais pas de profil dans Firestore (users).");
        return null;
      }
    } catch (error) {
      console.error("Erreur Firestore:", error);
      return null;
    }
  }

  // 4. INSCRIPTION CLIENT
  async register(email: string, pass: string) {
    // 1. On crée le compte dans Firebase Auth
    const credential = await createUserWithEmailAndPassword(this.auth, email, pass);
    const uid = credential.user.uid;
    let assignedRole = UserRole.CLIENT; // Par défaut, c'est un client
    let linkedRestaurantId = null;

    // 2. On vérifie si cet email est un "VIP" (Propriétaire de Resto)
    // Le Super Admin a déjà créé le resto avec cet email
    const restaurantsRef = collection(this.db, "restaurants");
    const q = query(restaurantsRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // BINGO ! C'est un restaurateur connu
      const restoDoc = querySnapshot.docs[0];
      assignedRole = UserRole.RESTAURANT_ADMIN;
      linkedRestaurantId = restoDoc.id;
      console.log(`🎉 Compte Restaurateur détecté pour ${restoDoc.data()['name']}`);
    }

    // 3. On crée le profil dans Firestore avec le bon rôle
    const userProfile: UserProfile = {
      uid: uid,
      email: email,
      role: assignedRole,
      restaurantId: linkedRestaurantId || undefined
    };

    await setDoc(doc(this.db, "users", uid), userProfile);

    return credential;
  }

  // Helpers
  getCurrentEmail(): string | null {
    return this.currentUserSubject.value?.email || null;
  }
}
