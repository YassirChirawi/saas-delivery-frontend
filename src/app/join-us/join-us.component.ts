import { Component } from '@angular/core';
import { ApiService } from '../services/api.service';
import { PartnerRequest } from '../models/request.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-join-us',
  templateUrl: './join-us.component.html'
})
export class JoinUsComponent {

  // Modèle du formulaire
  form: PartnerRequest = {
    ownerName: '',
    restaurantName: '',
    email: '',
    phone: '',
    description: '',
    address: '',
    status: 'PENDING'
  };

  isSubmitting = false;

  constructor(private apiService: ApiService, private router: Router) {}

  submitRequest() {
    this.isSubmitting = true;

    this.apiService.addPartnerRequest(this.form).subscribe({
      next: () => {
        alert("🎉 Votre demande a été envoyée avec succès ! Notre équipe vous contactera bientôt.");
        this.router.navigate(['/']); // Retour accueil
      },
      error: (err) => {
        console.error(err);
        alert("Oups, une erreur est survenue.");
        this.isSubmitting = false;
      }
    });
  }
}
