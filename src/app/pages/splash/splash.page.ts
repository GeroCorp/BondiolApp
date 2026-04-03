import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/supabase';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false
})
export class SplashPage implements OnInit, OnDestroy {
  private navigating = false;

  constructor(
    public router: Router, 

    private authService: AuthService
  ) { }

   async ngOnInit() {
    // ✅ Evitar múltiples ejecuciones
    if (this.navigating) {
      console.log('⚠️ Ya hay una navegación en curso');
      return;
    }

    console.log('🎬 Splash iniciado');
    console.log('📍 URL completa:', window.location.href);
    console.log('📍 Router URL actual:', this.router.url);

    try {
      this.navigating = true;

      // Esperar un momento para que la UI se cargue
      await new Promise(resolve => setTimeout(resolve, 2500));

      const sessionCheck = await this.authService.quickAutoLogin();

      if (sessionCheck.success && sessionCheck.redirectTo) {
        console.log('✅ Sesión detectada - redirigiendo a:', sessionCheck.redirectTo);
        await this.router.navigate([sessionCheck.redirectTo], { 
          replaceUrl: true // ✅ IMPORTANTE: reemplazar en historial
        });
      } else {
        console.log('⚠️ No hay sesión - ir a login');
        await this.router.navigate(['/login'], { 
          replaceUrl: true 
        });
      }

    } catch (error) {
      console.error('❌ Error en splash:', error);
      await this.router.navigate(['/login'], { 
        replaceUrl: true 
      });
    } finally {
      this.navigating = false;
    }
  }


  ngOnDestroy() {
    // Limpiar cualquier referencia si es necesario
  }

  // ✅ Stringify seguro para evitar circular references
  private safeStringify(obj: any): string {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      return String(obj);
    }
  }
}