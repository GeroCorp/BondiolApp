import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/supabase';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean | UrlTree> {
    try {
      const sessionCheck = await this.authService.checkSession();
      
      if (sessionCheck.isValid) {
        return true;
      } else {
        console.log('🔒 Acceso denegado - redirigiendo a login');
        return this.router.createUrlTree(['/login']);
      }
    } catch (error) {
      console.error('Error en AuthGuard:', error);
      return this.router.createUrlTree(['/login']);
    }
  }
}