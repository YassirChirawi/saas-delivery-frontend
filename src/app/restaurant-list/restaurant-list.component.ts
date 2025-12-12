import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { Restaurant } from '../models/restaurant.model';

@Component({
  selector: 'app-restaurant-list',
  templateUrl: './restaurant-list.component.html'
})
export class RestaurantListComponent implements OnInit {
  restaurants: Restaurant[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    // On ne charge que les restaurants ACTIFS (validés par toi)
    this.apiService.getRestaurants().subscribe(data => {
      this.restaurants = data.filter(r => r.active);
    });
  }
}
