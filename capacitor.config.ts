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
      style: 'DARK',          // texto oscuro (ideal si el fondo es claro)
      backgroundColor: '#ffffff', // fondo blanco para la barra
    },
    SplashScreen: {
      launchShowDuration: 1000, // indica cuanto tiempo va a durar el splash, por defecto viene en 3000
      launchAutoHide: true,
      // launchFadeOutDuration: 0, // cuanto dura el desvanecimiento de la splash screen
      backgroundColor: "#ff2525", // Darle el color de mi splash screen
    },
  },
};

export default config;
