import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  async onLogin() {
    try {
      this.errorMessage = '';

      // 1. Connexion (Renvoie un UserCredential grâce à la modif de l'étape 1)
      const credential = await this.auth.login(this.email, this.password);

      // 2. Extraction de l'UID (Plus d'erreur ici normalement)
      const uid = credential.user.uid;

      console.log("🔓 Authentification réussie. Recherche du profil...");

      // 3. Récupération du Rôle (Plus d'erreur car la méthode existe mtn)
      const profile = await this.auth.getUserProfile(uid);

      if (!profile) {
        this.errorMessage = "Erreur : Compte trouvé, mais aucun rôle défini dans la base de données.";
        return;
      }

      console.log(`👤 Rôle détecté : [${profile.role}]`);

      // 4. Aiguillage
      switch (profile.role) {
        case 'SUPER_ADMIN': // Assure-toi que c'est bien écrit pareil dans Firestore
          this.router.navigate(['/super-admin']);
          break;

        case 'RESTAURANT_ADMIN':
          this.router.navigate(['/admin']);
          break;

        case 'CLIENT':
          this.router.navigate(['/']);
          break;

        default:
          this.router.navigate(['/']);
      }

    } catch (error: any) {
      console.error(error);
      this.errorMessage = 'Email ou mot de passe incorrect.';
    }
  }
}
