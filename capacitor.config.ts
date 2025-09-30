import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'restoApp',
  webDir: 'www',
  android: {
    allowMixedContent: true
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false, // 👈 evita que el contenido se meta debajo de la barra
      style: 'WHITE',          // texto oscuro (ideal si el fondo es claro)
      backgroundColor: '#000000ff', // fondo blanco para la barra
    },
    SplashScreen: {
      // Va a tardar segundo y medio, con esto se ve splash estatico que es mejor que la pantalla negra a mi parecer
      launchShowDuration: 1000, // indica cuanto tiempo va a durar el splash, por defecto viene en 3000
      launchAutoHide: true,
      launchFadeOutDuration: 500, // fade out del splash, para no tener un cambio brusco
      backgroundColor: "#ff2525", // Darle el color de mi splash screen
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    CapacitorHttp: {
      enabled: true
    }
  },
};

export default config;
