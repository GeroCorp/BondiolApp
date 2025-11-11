import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.restoapp.mobile', // ✅ App ID único y profesional
  appName: 'RestoApp',          // ✅ Nombre más corto
  webDir: 'www',
  android: {
    allowMixedContent: true,
    // ✅ Configuraciones para evitar crashes del WebView
    webContentsDebuggingEnabled: true, // Habilitar debugging remoto
    useLegacyBridge: false,
    backgroundColor: '#ffffff',
    // ✅ Configuraciones adicionales para evitar errores del sistema
    appendUserAgent: 'RestoAppMobile/1.0',
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 RestoApp/1.0'
  },
  plugins: {
    SocialLogin: {
      google: {
        webClientId: '143351493481-fba5rkk25jstfus8okff8ndud3djh5kf.apps.googleusercontent.com', 
      }
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'WHITE',
      backgroundColor: '#000000ff',
    },
    SplashScreen: {
      // ✅ Configuración muy conservadora para evitar crashes
      launchShowDuration: 2000, // ✅ Más tiempo para cargar
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: "#ff2525",
      showSpinner: false, // ✅ Sin spinner para evitar problemas
      splashFullScreen: false,
      splashImmersive: false,
      androidSpinnerStyle: 'small'
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    CapacitorHttp: {
      enabled: true
    }
  },
  // ✅ Configuración del servidor para mejor compatibilidad
  server: {
    androidScheme: 'https',
    allowNavigation: ['*'],
    errorPath: 'error.html' // ✅ Página de error personalizada
  }
};

export default config;
