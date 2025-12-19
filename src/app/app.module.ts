import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ShopComponent } from './shop/shop.component';
import { AdminComponent } from './admin/admin.component';
import { SuperAdminComponent } from './super-admin/super-admin.component';
import { HomeComponent } from './home/home.component';
import { RestaurantsListComponent } from './restaurant-list/restaurant-list.component';
import { LoginComponent } from './login/login.component';


import { FormsModule } from '@angular/forms';
import { RegisterComponent } from './register/register.component';
import { JoinUsComponent } from './join-us/join-us.component';
import { HeaderComponent } from './header/header.component';

@NgModule({
  declarations: [
    AppComponent,
    ShopComponent,
    AdminComponent,
    SuperAdminComponent,
    HomeComponent,
    RestaurantsListComponent,
    LoginComponent,
    RegisterComponent,
    JoinUsComponent,
    HeaderComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
