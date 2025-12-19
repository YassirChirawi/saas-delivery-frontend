import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Définition des étapes pour la partie droite (Restaurateur)
type RestoStep = 'CHECK_EMAIL' | 'LOGIN' | 'REGISTER' | 'LEAD';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
})
export class RegisterComponent {

  // ==========================================
  // VARIABLES : PARTIE CLIENT (Gauche)
  // ==========================================
  registerForm: FormGroup;
  clientErrorMessage: string = '';
  clientSuccessMessage: string = '';
  clientLoading: boolean = false;

  // ==========================================
  // VARIABLES : PARTIE RESTAURATEUR (Droite)
  // ==========================================
  restoEmailForm: FormGroup;    // Etape 1 : Juste l'email
  restoAuthForm: FormGroup;     // Etape 2 : Mot de passe (Login ou Register)
  restoStep: RestoStep = 'CHECK_EMAIL';
  restoLoading: boolean = false;
  restoError: string = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    // --- INITIALISATION FORMULAIRE CLIENT ---
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      name: ['', Validators.required]
    });

    // --- INITIALISATION FORMULAIRES RESTAURATEUR ---
    this.restoEmailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.restoAuthForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: [''] // Utile seulement pour le mode REGISTER
    });
  }

  // ==========================================
  // LOGIQUE CLIENT (Gauche - Code existant)
  // ==========================================
  async onClientSubmit() {
    if (this.registerForm.invalid) return;

    this.clientLoading = true;
    this.clientErrorMessage = '';
    this.clientSuccessMessage = '';

    const { email, password, name } = this.registerForm.value;

    try {
      // Inscription Client Classique
      await this.auth.register(email, password); // Assure-toi que cette méthode existe

      this.clientSuccessMessage = "Compte client créé ! Redirection...";
      setTimeout(() => {
        this.router.navigate(['/login']); // Ou dashboard client
      }, 2000);

    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        this.clientErrorMessage = "Cet email est déjà utilisé.";
      } else {
        this.clientErrorMessage = "Une erreur est survenue.";
      }
    } finally {
      this.clientLoading = false;
    }
  }

  // ==========================================
  // LOGIQUE RESTAURATEUR (Droite - Nouvelle logique)
  // ==========================================

  // ÉTAPE 1 : VÉRIFICATION DE L'EMAIL
  async onCheckRestoEmail() {
    if (this.restoEmailForm.invalid) return;

    this.restoLoading = true;
    this.restoError = '';
    const emailToCheck = this.restoEmailForm.value.email;

    try {
      // APPEL AU SERVICE (Vérifie Firestore 'restaurants' + Firebase Auth)
      // Cette méthode doit retourner : 'LOGIN', 'REGISTER', ou 'LEAD'
      const status = await this.auth.checkRestaurateurStatus(emailToCheck);

      if (status === 'LOGIN') {
        this.restoStep = 'LOGIN';
      } else if (status === 'REGISTER') {
        this.restoStep = 'REGISTER';
      } else {
        this.restoStep = 'LEAD'; // Email inconnu dans la liste des restaurants
      }

    } catch (error) {
      console.error(error);
      this.restoError = "Impossible de vérifier le compte. Réessayez.";
    } finally {
      this.restoLoading = false;
    }
  }

  // ÉTAPE 2A : LOGIN (Le compte existe déjà)
  async onRestoLogin() {
    if (this.restoAuthForm.get('password')?.invalid) return;

    this.restoLoading = true;
    const email = this.restoEmailForm.value.email;
    const password = this.restoAuthForm.value.password;

    try {
      await this.auth.login(email, password);
      this.router.navigate(['/restaurateur/dashboard']); // Redirection Dashboard Pro
    } catch (error) {
      this.restoError = "Mot de passe incorrect.";
      this.restoLoading = false;
    }
  }

  // ÉTAPE 2B : INSCRIPTION (Le dossier est validé, on crée le compte)
  async onRestoRegister() {
    if (this.restoAuthForm.invalid) return;

    const { password, confirmPassword } = this.restoAuthForm.value;
    const email = this.restoEmailForm.value.email;

    if (password !== confirmPassword) {
      this.restoError = "Les mots de passe ne correspondent pas.";
      return;
    }

    this.restoLoading = true;

    try {
      // Création du compte Firebase Auth pour ce restaurateur validé
      await this.auth.register(email, password);

      // Optionnel : Mettre à jour Firestore pour dire "Compte activé"

      this.router.navigate(['/restaurateur/dashboard']);
    } catch (error: any) {
      console.error(error);
      this.restoError = "Erreur lors de l'activation du compte.";
      this.restoLoading = false;
    }
  }

  // BOUTON "RETOUR" OU "RESET"
  resetResto() {
    this.restoStep = 'CHECK_EMAIL';
    this.restoAuthForm.reset();
    this.restoError = '';
    this.restoLoading = false;
  }
}
