import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { getAuth } from 'firebase/auth';

import { ApiService } from '../services/api.service';
import { AuthService, UserRole } from '../services/auth.service';
import { Restaurant } from '../models/restaurant.model';
import { PartnerRequest } from '../models/request.model';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-super-admin',
  templateUrl: './super-admin.component.html',
  // ✅ J'ai supprimé 'standalone: true' et 'imports' qui faisaient planter ta version
})
export class SuperAdminComponent implements OnInit {

  requests: PartnerRequest[] = [];
  restaurants: Restaurant[] = [];
  restaurantForm: FormGroup;
  isSubmitting = false;

  constructor(
    private apiService: ApiService,
    private auth: AuthService,
    private router: Router,
    private fb: FormBuilder
  ) {
    // Initialisation du formulaire
    this.restaurantForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      address: ['', Validators.required],
      description: [''],
      whatsappPhone: ['', Validators.required],
      imageUrl: ['https://placehold.co/600x400?text=Restaurant']
    });
  }

  async ngOnInit() {
    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;

    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    const profile = await this.auth.getUserProfile(currentUser.uid);

    if (!profile || profile.role !== UserRole.SUPER_ADMIN) {
      this.router.navigate(['/admin']);
      return;
    }

    this.loadData();
  }

  loadData() {
    this.apiService.getRequests().subscribe({
      next: (data) => this.requests = data,
      error: (err) => console.error(err)
    });

    this.apiService.getRestaurants().subscribe({
      next: (data) => this.restaurants = data,
      error: (err) => console.error(err)
    });
  }

  approveRequest(req: PartnerRequest) {
    if (!confirm(`Valider la demande de "${req.restaurantName}" ?`)) return;

    const newRestaurant: Restaurant = {
      name: req.restaurantName,
      email: req.email,
      whatsappPhone: req.phone,
      address: req.address,
      description: req.description || "Nouveau restaurant partenaire.",
      imageUrl: 'https://placehold.co/600x400?text=' + encodeURIComponent(req.restaurantName),
      active: true,
      rating: 0,
      ratingCount: 0,
      tags: []
    };

    this.apiService.createRestaurant(newRestaurant).subscribe({
      next: () => {
        this.deleteRequestAndRefresh(req.id!);
        alert(`✅ Restaurant créé !`);
      },
      error: () => alert("Erreur lors de la validation.")
    });
  }

  rejectRequest(req: PartnerRequest) {
    if (!confirm("Refuser définitivement ?")) return;
    this.deleteRequestAndRefresh(req.id!);
  }

  private deleteRequestAndRefresh(id: string) {
    this.apiService.deleteRequest(id).subscribe(() => this.loadData());
  }

  contactOwner(req: PartnerRequest) {
    window.location.href = `mailto:${req.email}?subject=Votre demande d'inscription`;
  }

  onManualSubmit() {
    if (this.restaurantForm.invalid) return;
    this.isSubmitting = true;
    const formValues = this.restaurantForm.value;

    const newResto: Restaurant = {
      name: formValues.name,
      email: formValues.email,
      address: formValues.address,
      description: formValues.description,
      whatsappPhone: formValues.whatsappPhone,
      imageUrl: formValues.imageUrl,
      active: true,
      rating: 0,
      ratingCount: 0,
      tags: []
    };

    this.apiService.createRestaurant(newResto).subscribe({
      next: () => {
        alert("Restaurant ajouté !");
        this.restaurantForm.reset({ imageUrl: 'https://placehold.co/600x400?text=Restaurant' });
        this.isSubmitting = false;
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.isSubmitting = false;
      }
    });
  }

  toggleBlockRestaurant(resto: Restaurant) {
    const newStatus = !resto.active;
    const originalStatus = resto.active;
    resto.active = newStatus;

    this.apiService.updateRestaurant(resto.id!, { active: newStatus }).subscribe({
      next: () => console.log(`Statut MAJ`),
      error: () => {
        alert("Erreur MAJ statut");
        resto.active = originalStatus;
      }
    });
  }

  deleteRestaurant(id: string) {
    const confirmId = prompt("Pour supprimer, tapez 'SUPPRIMER' :");
    if (confirmId === 'SUPPRIMER') {
      this.apiService.deleteRestaurant(id).subscribe({
        next: () => this.loadData(),
        error: () => alert("Erreur suppression")
      });
    }
  }

  manageRestaurant(resto: Restaurant) {
    this.router.navigate(['/admin'], { queryParams: { impersonate: resto.id } });
  }

  logout() {
    this.auth.logout();
  }
}
