import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShopComponent } from './shop/shop.component';
import { AdminComponent } from './admin/admin.component';

const routes: Routes = [
  { path: '', redirectTo: 'shop', pathMatch: 'full' }, // Redirection auto vers shop
  { path: 'shop', component: ShopComponent },          // Page Client
  { path: 'admin', component: AdminComponent }         // Page Admin
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
