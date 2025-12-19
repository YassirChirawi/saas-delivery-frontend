import { Component } from '@angular/core';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html'

})
export class RegisterComponent {

  // Gestion des onglets
  activeTab: 'client' | 'restaurant' = 'client';

  // Données du client
  client = {
    nom: '',
    prenom: '',
    email: '',
    phone: '',
    address: '' // Champ très important
  };

  // Logique du Code Partenaire
  accessCode: string = '';
  isRestoUnlocked: boolean = false;
  codeError: boolean = false;

  // Données du restaurant (une fois débloqué)
  restaurant = {
    name: '',
    siret: '',
    email: '',
    password: ''
  };

  // Fonction pour changer d'onglet
  switchTab(tab: 'client' | 'restaurant') {
    this.activeTab = tab;
    this.codeError = false; // Reset l'erreur si on change
  }

  // Fonction pour vérifier le code 0000
  verifyCode() {
    if (this.accessCode === '0000') {
      this.isRestoUnlocked = true;
      this.codeError = false;
    } else {
      this.codeError = true;
      // Petit effet : on vide le champ après erreur
      setTimeout(() => this.accessCode = '', 500);
    }
  }

  onRegisterClient() {
    console.log('Inscription Client:', this.client);
    // Ici tu appelles ton service d'auth
  }

  onRegisterRestaurant() {
    console.log('Inscription Resto:', this.restaurant);
    // Ici tu appelles ton service d'auth
  }
}
