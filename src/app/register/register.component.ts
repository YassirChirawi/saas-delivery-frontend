import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
})
export class RegisterComponent {

  registerForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = ''; // 👈 Pour le message de confirmation
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    // On ajoute le champ password
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]], // 👈 OBLIGATOIRE (min 6 caractères pour Firebase)
      name: ['', Validators.required] // Optionnel, pour dire "Bonjour X"
    });
  }

  async onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { email, password, name } = this.registerForm.value;

    try {
      // On passe le mot de passe à la fonction register
      await this.auth.register(email, password);

      // ✅ MESSAGE DE SUCCÈS
      this.successMessage = "Compte créé avec succès ! Redirection...";

      // On attend 2 secondes pour qu'il lise le message, puis on redirige vers Login
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);

    } catch (err: any) {
      console.error(err);
      // Gestion des erreurs classiques
      if (err.code === 'auth/email-already-in-use') {
        this.errorMessage = "Cet email est déjà utilisé.";
      } else if (err.code === 'auth/weak-password') {
        this.errorMessage = "Le mot de passe doit faire au moins 6 caractères.";
      } else {
        this.errorMessage = "Une erreur est survenue. Réessayez.";
      }
      this.isLoading = false;
    }
  }
}
