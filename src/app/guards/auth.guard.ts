import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    // On observe l'utilisateur actuel
    return this.authService.user$.pipe(
      map(user => {
        // Si user existe (connecté) -> return TRUE (laisse passer)
        // Si user null (pas connecté) -> return FALSE (bloque)
        return !!user;
      }),
      tap(isLoggedIn => {
        if (!isLoggedIn) {
          console.log("⛔ Accès refusé ! Redirection vers Login.");
          this.router.navigate(['/login']);
        }
      })
    );
  }
}
