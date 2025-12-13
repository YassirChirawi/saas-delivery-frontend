import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, User, onAuthStateChanged } from 'firebase/auth';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // On initialise Firebase avec la config
  private app = initializeApp(environment.firebase);
  private auth = getAuth(this.app);

  // Variable qui contient l'utilisateur actuel (null s'il n'est pas connecté)
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  user$ = this.currentUserSubject.asObservable();

  constructor(private router: Router) {
    // On écoute si l'utilisateur se connecte ou se déconnecte (persistance)
    onAuthStateChanged(this.auth, (user) => {
      this.currentUserSubject.next(user);
      console.log("👤 État Auth changé :", user ? user.email : 'Déconnecté');
    });
  }

  // 1. Se Connecter
  async login(email: string, pass: string) {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, pass);
      return credential.user;
    } catch (error) {
      throw error;
    }
  }

  // 2. Se Déconnecter
  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']); // On renvoie vers la page de login
  }

  // 3. Savoir si on est connecté (Utile pour les Guards)
  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  // 4. Récupérer l'email actuel
  getCurrentEmail(): string | null {
    return this.currentUserSubject.value?.email || null;
  }
}
