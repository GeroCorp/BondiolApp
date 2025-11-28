import { Injectable, inject } from '@angular/core';
import { LoadingController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class CustomLoaderService {
  private loadingController = inject(LoadingController);
  private loading: any;

  async show(message: string = 'Cargando...', duration?: number) {
    this.loading = await this.loadingController.create({
      message: message,
      spinner: null,
      cssClass: 'custom-loader custom-spinner-overlay',
      duration: duration || 0,
      translucent: false
    });
    await this.loading.present();
  }

  async hide() {
    if (this.loading) {
      await this.loading.dismiss();
    }
  }

  async showWithTimeout(message: string = 'Cargando...', ms: number = 3000) {
    await this.show(message, ms);
  }
}
