import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  fetchSignInMethodsForEmail, // 👈 AJOUT INDISPENSABLE ICI
  User,
  UserCredential
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

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
  private db = getFirestore(this.app);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  user$ = this.currentUserSubject.asObservable();

  constructor(private router: Router) {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUserSubject.next(user);
    });
  }

  // ============================================================
  //  NOUVELLE MÉTHODE : CHECK RESTAURATEUR (Pour le Register)
  // ============================================================
  async checkRestaurateurStatus(email: string): Promise<'LOGIN' | 'REGISTER' | 'LEAD'> {
    try {
      // 1. Vérifier si l'email existe dans la collection "restaurants" (Firestore)
      const restaurantsRef = collection(this.db, "restaurants");
      const q = query(restaurantsRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      // Si l'email n'est pas dans la liste des restos -> C'est un inconnu (Lead)
      if (querySnapshot.empty) {
        return 'LEAD';
      }

      // 2. Vérifier si un compte Auth existe déjà pour cet email
      // Renvoie un tableau (ex: ['password']). Si vide = pas de compte créé.
      const methods = await fetchSignInMethodsForEmail(this.auth, email);

      if (methods.length > 0) {
        return 'LOGIN'; // Le resto est validé ET il a déjà créé son compte (Mot de passe existe)
      } else {
        return 'REGISTER'; // Le resto est validé MAIS n'a pas encore de compte (Ton cas cible)
      }

    } catch (error) {
      console.error("Erreur checkRestaurateurStatus:", error);
      return 'LEAD'; // Sécurité : en cas d'erreur, on redirige vers le formulaire de contact
    }
  }

  // ============================================================
  //  MÉTHODES EXISTANTES
  // ============================================================

  // 1. LOGIN
  async login(email: string, pass: string): Promise<UserCredential> {
    return await signInWithEmailAndPassword(this.auth, email, pass);
  }

  // 2. LOGOUT
  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  // 3. RÉCUPÉRER LE PROFIL
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

  // 4. INSCRIPTION (Utilisé par Client ET Restaurateur)
  async register(email: string, pass: string) {
    // 1. On crée le compte dans Firebase Auth
    const credential = await createUserWithEmailAndPassword(this.auth, email, pass);
    const uid = credential.user.uid;
    let assignedRole = UserRole.CLIENT; // Par défaut, c'est un client
    let linkedRestaurantId = null;

    // 2. On revérifie si cet email est un "VIP" (Propriétaire de Resto) pour attribuer le rôle
    const restaurantsRef = collection(this.db, "restaurants");
    const q = query(restaurantsRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // BINGO ! C'est un restaurateur connu
      const restoDoc = querySnapshot.docs[0];
      assignedRole = UserRole.RESTAURANT_ADMIN;
      linkedRestaurantId = restoDoc.id;
      console.log(`🎉 Compte Restaurateur activé pour ${restoDoc.data()['name']}`);
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
