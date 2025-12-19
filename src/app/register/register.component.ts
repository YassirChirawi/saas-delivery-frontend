import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Les états possibles pour la partie droite
type RestoStep = 'CHECK_EMAIL' | 'LOGIN' | 'REGISTER' | 'LEAD';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
})
export class RegisterComponent {

  // --- PARTIE CLIENT (Ton code existant) ---
  registerForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  // --- PARTIE RESTAURATEUR (Nouveau) ---
  restoForm: FormGroup;       // Pour l'étape 1 (Email)
  restoAuthForm: FormGroup;   // Pour l'étape 2 (Password)
  restoStep: RestoStep = 'CHECK_EMAIL';
  restoLoading: boolean = false;
  restoError: string = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService, // Assure-toi que ton AuthService gère aussi les restaurateurs si besoin
    private router: Router
  ) {
    // 1. Formulaire Client (Ton code)
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      name: ['', Validators.required]
    });

    // 2. Formulaire Restaurateur - Etape Email
    this.restoForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    // 3. Formulaire Restaurateur - Etape Mot de passe
    this.restoAuthForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: [''] // Uniquement pour le register
    });
  }

  // ==========================================
  // LOGIQUE CLIENT (Ton code existant)
  // ==========================================
  async onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { email, password, name } = this.registerForm.value;

    try {
      await this.auth.register(email, password); // Supposons que c'est registerClient
      this.successMessage = "Compte créé avec succès ! Redirection...";
      setTimeout(() => {
        this.router.navigate(['/client/home']); // Redirection Client
      }, 2000);

    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        this.errorMessage = "Cet email est déjà utilisé.";
      } else {
        this.errorMessage = "Une erreur est survenue.";
      }
      this.isLoading = false;
    }
  }

  // ==========================================
  // LOGIQUE RESTAURATEUR (Nouvelle logique)
  // ==========================================

  // Etape 1 : Vérifier l'email
  async onCheckRestoEmail() {
    if (this.restoForm.invalid) return;

    this.restoLoading = true;
    this.restoError = '';
    const emailToCheck = this.restoForm.value.email;

    try {
      // --- ICI APPEL BACKEND RÉEL ---
      // const status = await this.auth.checkRestoStatus(emailToCheck);

      // --- MOCK POUR TESTER (A supprimer quand tu as ton backend) ---
      const status = await this.mockBackendCheck(emailToCheck);

      if (status === 'ACCOUNT_EXISTS') {
        this.restoStep = 'LOGIN';
      } else if (status === 'APPLICATION_ACCEPTED') {
        this.restoStep = 'REGISTER';
      } else {
        this.restoStep = 'LEAD';
      }

    } catch (error) {
      this.restoError = "Impossible de vérifier l'email.";
    } finally {
      this.restoLoading = false;
    }
  }

  // Etape 2A : Login Restaurateur
  async onRestoLogin() {
    console.log("Login Resto avec :", this.restoForm.value.email, this.restoAuthForm.value.password);
    // await this.auth.login(email, password)...
  }

  // Etape 2B : Création Compte Restaurateur (Suite acceptation)
  async onRestoRegister() {
    const { password, confirmPassword } = this.restoAuthForm.value;
    if (password !== confirmPassword) {
      this.restoError = "Les mots de passe ne correspondent pas.";
      return;
    }
    console.log("Création compte Resto validé pour :", this.restoForm.value.email);
    // await this.auth.completeRegistration(email, password)...
  }

  // Reset pour changer d'email
  resetResto() {
    this.restoStep = 'CHECK_EMAIL';
    this.restoAuthForm.reset();
    this.restoError = '';
  }

  // SIMULATION BACKEND (A virer plus tard)
  mockBackendCheck(email: string): Promise<string> {
    return new Promise(resolve => {
      setTimeout(() => {
        if (email === 'admin@resto.com') resolve('ACCOUNT_EXISTS');
        else if (email === 'new@resto.com') resolve('APPLICATION_ACCEPTED');
        else resolve('UNKNOWN');
      }, 1000);
    });
  }
}
