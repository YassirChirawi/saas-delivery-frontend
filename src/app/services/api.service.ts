import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Product } from '../models/product.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) {}

  private apiUrl = 'https://saas-delivery-api.onrender.com/api/v1/products';


  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }


  addProduct(product: Product): Observable<any> {
    return this.http.post(this.apiUrl, product, { responseType: 'text' });
  }
}
