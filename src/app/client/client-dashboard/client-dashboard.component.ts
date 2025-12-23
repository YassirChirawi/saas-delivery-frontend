import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, NgZone } from '@angular/core';

declare var google: any;

import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-client-dashboard',
  templateUrl: './client-dashboard.component.html',
})
export class ClientDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('addressInput') addressInput!: ElementRef;


  activeTab: 'history' | 'profile' | 'support' = 'history';
  orders: any[] = [];
  currentUser: any;
  profileForm: FormGroup;
  isUpdating = false;

  constructor(
    public auth: AuthService,
    private orderService: OrderService,
    private fb: FormBuilder,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.profileForm = this.fb.group({
      displayName: ['', Validators.required],
      phone: ['', Validators.required],
      address: ['']
    });
  }

  async ngOnInit() {
    // 1. Récupérer l'utilisateur connecté
    const user = await this.auth.getCurrentUser(); // Assure-toi d'avoir une méthode similaire ou utilise l'observable

    if (user) {
      // On charge les infos du profil Firestore
      const profile = await this.auth.getUserProfile(user.uid);
      this.currentUser = { ...user, ...profile };

      // Remplir le formulaire
      this.profileForm.patchValue({
        displayName: this.currentUser.displayName || this.currentUser.email,
        phone: this.currentUser.phoneNumber || '',
        address: this.currentUser.address || ''
      });

      // 2. Charger l'historique des commandes
      this.orderService.getOrdersByUser(user.uid).subscribe(data => {
        this.orders = data;
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  ngAfterViewInit(): void {
    // On attend un peu que le DOM soit prêt si l'onglet 'profile' n'est pas par défaut (ici il l'est pas, mais au cas où)
    // Mais ici l'onglet par défaut est 'history', donc le champ n'existe pas encore.
  }

  // Quand on change d'onglet, on check si on doit init l'autocomplete
  setTab(tab: 'history' | 'profile' | 'support') {
    this.activeTab = tab;
    if (tab === 'profile') {
      setTimeout(() => this.initAutocomplete(), 200);
    }
  }

  initAutocomplete() {
    if (!this.addressInput) return;

    const autocomplete = new google.maps.places.Autocomplete(this.addressInput.nativeElement, {
      types: ['address'],
      componentRestrictions: { country: 'fr' }
    });

    autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place: google.maps.places.PlaceResult = autocomplete.getPlace();
        if (place.geometry && place.formatted_address) {
          this.profileForm.patchValue({ address: place.formatted_address });
        } else {
          this.profileForm.patchValue({ address: this.addressInput.nativeElement.value });
        }
      });
    });
  }

  async updateProfile() {
    if (this.profileForm.invalid) return;
    this.isUpdating = true;

    try {
      await this.auth.updateUserProfile(this.currentUser.uid, {
        displayName: this.profileForm.value.displayName,
        phoneNumber: this.profileForm.value.phone,
        address: this.profileForm.value.address
      });
      alert('Profil mis à jour ! ✅');
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la mise à jour.');
    }
    this.isUpdating = false;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // Helpers pour l'affichage (Date et Statut)
  formatDate(timestamp: number): string {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'PENDING': 'En attente',
      'CONFIRMED': 'Confirmée',
      'DELIVERING': 'En route / Prête',
      'DONE': 'Terminée',
      'REJECTED': 'Refusée'
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'CONFIRMED': return 'text-blue-600 bg-blue-100';
      case 'DONE': return 'text-green-600 bg-green-100';
      case 'REJECTED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }
}
