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
      const user = await this.auth.login(this.email, this.password);

      console.log("Connexion réussie :", user.email);

      // 👇 LOGIQUE DE REDIRECTION
      if (user.email === 'super@admin.com') {
        this.router.navigate(['/super-admin']);
      } else {
        this.router.navigate(['/admin']);
      }

    } catch (error: any) {
      console.error(error);
      this.errorMessage = 'Email ou mot de passe incorrect.';
    }
    }
  }

