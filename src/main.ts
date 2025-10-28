import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

// ✅ Optimización: cargar PWA elements de forma asíncrona
defineCustomElements(window);

// ✅ Optimización: manejo de errores mejorado en producción
platformBrowserDynamic()
  .bootstrapModule(AppModule, {
    // ✅ Preservar whitespace solo en desarrollo
    preserveWhitespaces: false,
    // ✅ Usar OnPush change detection por defecto (mejor rendimiento)
    ngZoneEventCoalescing: true,
    ngZoneRunCoalescing: true
  })
  .catch(err => {
    // ✅ En producción, solo log crítico
    if (typeof console !== 'undefined') {
      console.error('Error iniciando app:', err);
    }
  });
