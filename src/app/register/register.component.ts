import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  email = '';
  password = '';
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  async onRegister() {
    try {
      this.errorMessage = '';
      await this.auth.register(this.email, this.password);

      // Une fois inscrit, on redirige vers le login ou l'accueil
      alert("Compte créé avec succès ! Connectez-vous.");
      this.router.navigate(['/login']);

    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        this.errorMessage = "Cet email est déjà utilisé.";
      } else {
        this.errorMessage = "Erreur lors de l'inscription.";
      }
    }
  }
}
