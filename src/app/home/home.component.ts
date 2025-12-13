import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service'; // Import

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html'
})
export class HomeComponent {

  // On injecte public pour l'utiliser dans le HTML
  constructor(public auth: AuthService) {}

  logout() {
    this.auth.logout();
  }
}
