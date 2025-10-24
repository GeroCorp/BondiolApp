import { Injectable } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class HapticService {

  constructor(private platform: Platform) { }

  /**
   * Vibración para errores (300ms)
   */
  async vibrateError(): Promise<void> {
    await this.vibrate(300);
  }

  /**
   * Vibración para éxito (100ms)
   */
  async vibrateSuccess(): Promise<void> {
    try {
      if (this.platform.is('capacitor')) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else {
        this.fallbackVibrate(100);
      }
    } catch (error) {
      console.warn('Haptics.impact failed, using fallback:', error);
      this.fallbackVibrate(100);
    }
  }

  /**
   * Vibración para advertencias (200ms)
   */
  async vibrateWarning(): Promise<void> {
    try {
      if (this.platform.is('capacitor')) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else {
        this.fallbackVibrate(200);
      }
    } catch (error) {
      console.warn('Haptics.impact failed, using fallback:', error);
      this.fallbackVibrate(200);
    }
  }

  async vibrateTest(): Promise<void> {
    try{
      if (this.platform.is('capacitor')) {
        console.log("Entra la balubiiiiiiiiiiiiiiiiiiiiiiiii");
        await Haptics.vibrate({ duration: 500 });
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else {
        this.fallbackVibrate(500);
      }
    }
    catch (err) {
      console.log(err);
    }
  }

  /**
   * Vibración customizable - versión simplificada que prioriza navigator.vibrate
   */
  async vibrate(duration: number = 300): Promise<void> {
    console.log(`Attempting vibration: ${duration}ms`);
    
    // Probar navigator.vibrate primero (más confiable)
    if ('vibrate' in navigator) {
      try {
        const result = navigator.vibrate(duration);
        console.log(`Navigator.vibrate(${duration}) result:`, result);
        return;
      } catch (error) {
        console.warn('Navigator.vibrate failed:', error);
      }
    }

    // Si navigator.vibrate falla, intentar Capacitor Haptics
    if (this.platform.is('capacitor')) {
      try {
        await Haptics.vibrate({ duration });
        console.log('Capacitor Haptics.vibrate succeeded');
      } catch (error) {
        console.warn('Capacitor Haptics.vibrate failed:', error);
      }
    } else {
      console.warn('No vibration method available');
    }
  }

  /**
   * Método de fallback usando navigator.vibrate
   */
  private fallbackVibrate(duration: number): void {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(duration);
        console.log(`Fallback vibration: ${duration}ms`);
      } else {
        console.warn('Navigator.vibrate not supported');
      }
    } catch (error) {
      console.error('Fallback vibration failed:', error);
    }
  }
}