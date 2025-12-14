import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms'; // 👈 Nécessaire pour l'ajout manuel
import { getAuth } from 'firebase/auth';

// Services
import { ApiService } from '../services/api.service';
import { AuthService, UserRole } from '../services/auth.service';

// Modèles
import { Restaurant } from '../models/restaurant.model';
import { PartnerRequest } from '../models/request.model';

@Component({
  selector: 'app-super-admin',
  templateUrl: './super-admin.component.html'
})
export class SuperAdminComponent implements OnInit {

  // Données
  requests: PartnerRequest[] = [];    // Demandes en attente
  restaurants: Restaurant[] = [];     // Restaurants actifs

  // Formulaire (Pour l'ajout manuel)
  restaurantForm: FormGroup;
  isSubmitting = false;

  constructor(
    private apiService: ApiService,
    private auth: AuthService,
    private router: Router,
    private fb: FormBuilder // 👈 Injection du constructeur de formulaire
  ) {
    // Initialisation du formulaire manuel
    this.restaurantForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      address: ['', Validators.required],
      description: [''],
      whatsappPhone: ['', Validators.required],
      imageUrl: ['https://placehold.co/600x400?text=Restaurant'] // Image par défaut
    });
  }

  async ngOnInit() {
    // 🔒 1. SÉCURITÉ
    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;

    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    const profile = await this.auth.getUserProfile(currentUser.uid);

    if (!profile || profile.role !== UserRole.SUPER_ADMIN) {
      console.warn("⛔ Accès refusé : Vous n'êtes pas Super Admin.");
      this.router.navigate(['/admin']);
      return;
    }

    // ✅ 2. CHARGEMENT DES DONNÉES
    this.loadData();
  }

  loadData() {
    // Charger les demandes
    this.apiService.getRequests().subscribe({
      next: (data) => this.requests = data,
      error: (err) => console.error("Erreur chargement demandes", err)
    });

    // Charger les restaurants
    this.apiService.getRestaurants().subscribe({
      next: (data) => this.restaurants = data,
      error: (err) => console.error("Erreur chargement restaurants", err)
    });
  }

  // =========================================================
  // 🆕 PARTIE 1 : GESTION DES DEMANDES (WORKFLOW AUTOMATIQUE)
  // =========================================================

  approveRequest(req: PartnerRequest) {
    if (!confirm(`Valider la demande de "${req.restaurantName}" ?`)) return;

    // Création de l'objet Restaurant basé sur la demande
    const newRestaurant: Restaurant = {
      name: req.restaurantName,
      email: req.email,
      whatsappPhone: req.phone,
      description: req.description || "Nouveau restaurant.",
      address: req.address,
      imageUrl: 'https://placehold.co/600x400?text=Restaurant',
      active: true
    };

    // 1. Créer le resto
    this.apiService.createRestaurant(newRestaurant).subscribe({
      next: () => {
        // 2. Supprimer la demande
        this.deleteRequestAndRefresh(req.id!);
        alert(`✅ Restaurant créé ! Dites à ${req.ownerName} de s'inscrire avec : ${req.email}`);
      },
      error: () => alert("Erreur lors de la validation.")
    });
  }

  rejectRequest(req: PartnerRequest) {
    if (!confirm("Refuser définitivement cette demande ?")) return;
    this.deleteRequestAndRefresh(req.id!);
  }

  private deleteRequestAndRefresh(id: string) {
    this.apiService.deleteRequest(id).subscribe(() => this.loadData());
  }

  contactOwner(req: PartnerRequest) {
    window.location.href = `mailto:${req.email}?subject=Votre demande d'inscription`;
  }

  // =========================================================
  // 🛠️ PARTIE 2 : GESTION MANUELLE (ANCIENNES FONCTIONS)
  // =========================================================

  // 1. AJOUTER MANUELLEMENT (Via le formulaire du bas)
  onManualSubmit() {
    if (this.restaurantForm.invalid) return;
    this.isSubmitting = true;

    const newResto: Restaurant = {
      ...this.restaurantForm.value,
      active: true
    };

    this.apiService.createRestaurant(newResto).subscribe({
      next: () => {
        alert("Restaurant ajouté manuellement !");
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

  // 2. ACTIVER / DÉSACTIVER (Toggle)
  toggleStatus(resto: Restaurant) {
    // On inverse le statut localement pour l'effet visuel immédiat
    const newStatus = !resto.active;
    const originalStatus = resto.active; // Backup en cas d'erreur
    resto.active = newStatus;

    // On envoie la mise à jour au backend
    // (Assure-toi d'avoir updateRestaurant dans ApiService)
    this.apiService.updateRestaurant(resto.id!, resto).subscribe({
      next: () => console.log(`Statut de ${resto.name} changé : ${newStatus}`),
      error: () => {
        alert("Erreur lors du changement de statut.");
        resto.active = originalStatus; // On remet comme avant
      }
    });
  }

  // 3. SUPPRIMER UN RESTAURANT
  deleteRestaurant(id: string) {
    if (confirm("⚠️ Attention : Supprimer ce restaurant effacera aussi son menu. Continuer ?")) {
      this.apiService.deleteRestaurant(id).subscribe({
        next: () => this.loadData(),
        error: () => alert("Erreur lors de la suppression.")
      });
    }
  }

  logout() {
    this.auth.logout();
  }
}
