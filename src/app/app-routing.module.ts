import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShopComponent } from './shop/shop.component';
import { AdminComponent } from './admin/admin.component';
import {SuperAdminComponent} from "./super-admin/super-admin.component";
import {HomeComponent} from "./home/home.component";
import {RestaurantsListComponent} from "./restaurant-list/restaurant-list.component";
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './guards/auth.guard';
import { RegisterComponent} from "./register/register.component";
import {JoinUsComponent} from "./join-us/join-us.component";

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'restaurants', component: RestaurantsListComponent },
  { path: 'shop/:id', component: ShopComponent },          // Page Client
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AuthGuard] // Le vigile surveille l'entrée
  },       // Page Admin
  {
    path: 'super-admin',
    component: SuperAdminComponent,
    canActivate: [AuthGuard] // Le vigile surveille l'entrée aussi
  },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'join-us', component: JoinUsComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
