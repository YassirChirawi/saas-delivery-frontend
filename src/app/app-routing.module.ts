import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShopComponent } from './shop/shop.component';
import { AdminComponent } from './admin/admin.component';
import {SuperAdminComponent} from "./super-admin/super-admin.component";
import {HomeComponent} from "./home/home.component";
import {RestaurantListComponent} from "./restaurant-list/restaurant-list.component";

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'restaurants', component: RestaurantListComponent },
  { path: 'shop/:id', component: ShopComponent },          // Page Client
  { path: 'admin', component: AdminComponent },         // Page Admin
  { path: 'super-admin', component: SuperAdminComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
