import { Injectable } from '@angular/core';
import { Capacitor, CapacitorHttp, HttpResponse } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import OneSignal from 'onesignal-cordova-plugin';
import { environment } from 'src/environments/environment';
import { INotification } from '../models/notification.model';
import { ClienteService } from './cliente.service';
import * as moment from 'moment-timezone';

@Injectable({
  providedIn: 'root'
})
export class Notification {
  constructor(
    private clienteService: ClienteService
  ) { }
  init() {
    const isPushNotificationAvailable = Capacitor.isPluginAvailable('PushNotifications');
  
    if(isPushNotificationAvailable) {
      PushNotifications.requestPermissions().then((result) => {
        if(result.receive) {
          OneSignal.initialize(environment.oneSignalID);

          // Listener para clicks en notificaciones (opcional)
          // OneSignal.Notifications.addEventListener('click', (e) => {
          //   const notification: any = e.notification;
          //   if(notification.additionalData['url']){
          //     // Navegar a la URL
          //   }
          // })
        }
      })
    }
  }

  /**
   * Verifica si OneSignal está disponible y correctamente inicializado
   */
  private isOneSignalAvailable(): boolean {
    const isPushAvailable = Capacitor.isPluginAvailable('PushNotifications');
    const isNativePlatform = Capacitor.isNativePlatform();
    
    if (!isPushAvailable || !isNativePlatform) {
      console.warn('⚠️ OneSignal solo funciona en dispositivos móviles nativos');
      return false;
    }
    
    return true;
  }

  /**
   * Establece el tag de perfil del usuario en OneSignal
   * @param perfil - 'dueño', 'supervisor', 'cocinero', 'bartender', 'maitre', 'cliente'
   */
  setUserTag(perfil: string) {
    if (!this.isOneSignalAvailable()) {
      console.log(`[Web Mode] Tag de perfil simulado: ${perfil}`);
      return;
    }

    try {
      OneSignal.User.addTags({ perfil: perfil });
      console.log(`✅ Tag de perfil establecido: ${perfil}`);
    } catch (error) {
      console.error('❌ Error al establecer tag:', error);
    }
  }

  /**
   * Establece el External User ID (user_id de Supabase o id_clienteanonimo en caso de ser anonimo)
   * @param userId - ID del usuario en Supabase
   */
  setExternalUserId(userId: string) {
    if (!this.isOneSignalAvailable()) {
      console.log(`[Web Mode] External User ID simulado: ${userId}`);
      return;
    }

    try {
      OneSignal.login(userId);
      console.log(`✅ External User ID establecido: ${userId}`);
    } catch (error) {
      console.error('❌ Error al establecer External User ID:', error);
    }
  }

  /**
   * Remueve los tags cuando el usuario cierra sesión
   */
  clearUserTags() {
    if (!this.isOneSignalAvailable()) {
      console.log('[Web Mode] Tags removidos (simulado)');
      return;
    }

    try {
      OneSignal.User.removeTags(['perfil']);
      OneSignal.logout();
      console.log('✅ Tags removidos');
    } catch (error) {
      console.error('❌ Error al remover tags:', error);
    }
  }

  /**
   * Envía notificación solo a dueños y supervisores
   * @param title - Título de la notificación
   * @param body - Cuerpo de la notificación
   * @param url - URL opcional para redirección
   */
  async sendNotificationToAdmins(title: string, body: string, url: string = '') {
    try {
      const response = await CapacitorHttp.post({
        url: 'https://onesignal.com/api/v1/notifications',
        params: {},
        data: {
          app_id: environment.oneSignalID,
          // Enviar solo a usuarios con tag perfil = dueño O supervisor
          filters: [
            {"field": "tag", "key": "perfil", "relation": "=", "value": "dueño"},
            {"operator": "OR"},
            {"field": "tag", "key": "perfil", "relation": "=", "value": "supervisor"}
          ],
          headings: { "en": title },
          contents: { "en": body },
          data: { url: url }
        },
        headers: {
          'Content-type': 'application/json',
          'Authorization': `Basic ${environment.oneSignalRestApi}`
        }
      });

      console.log('📤 Respuesta de OneSignal:', response);

      if (response.status === 200) {
        console.log('✅ Notificación a admins enviada exitosamente');
        return true;
      } else {
        console.error('❌ Error al enviar notificación:', response.data);
        return false;
      }
    } catch (err: any) {
      console.error('❌ Error en sendNotificationToAdmins:', err);
      return false;
    }
  }

  /**
   * Envía notificación a un perfil específico
   * @param perfil - 'dueño', 'supervisor', 'cocinero', 'bartender', 'maitre', 'mozo', 'delivery'
   * @param title - Título
   * @param body - Cuerpo
   * @param url - URL opcional
   */
  sendNotificationToPerfil(perfil: string, title: string, body: string, url: string = '') {
    return CapacitorHttp.post({
      url: 'https://onesignal.com/api/v1/notifications',
      params: {},
      data: {
        app_id: environment.oneSignalID,
        filters: [
          {"field": "tag", "key": "perfil", "relation": "=", "value": perfil}
        ],
        headings: { "en": title },
        contents: { "en": body },
        data: { url: url }
      },
      headers: {
        'Content-type': 'application/json',
        'Authorization': `Basic ${environment.oneSignalRestApi}`
      }
    }).then((response: HttpResponse) => {
      console.log(`Notificación a ${perfil} enviada:`, response);
      return response.status === 200;
    }).catch(err => {
      console.error(`Error enviando notificación a ${perfil}:`, err);
      return false;
    })
  }
  /*
  * Envía notificación a un cliente específico
  * @param title - Título
  * @param body - Cuerpo
  * @param url - URL opcional
  * @param cliente_id - ID del cliente (si no se provee, se obtiene del servicio)
  */
  async sendNotificationToCliente(title: string, body: string, url?: string, cliente_id: number | null = null) {
    // En caso que no se pase id por parametros obtiene la del cliente actual (sesión)
    if (cliente_id === null) cliente_id = await this.clienteService.getClientId(); // ✅ ARREGLADO
    if (!url) url = '';

    return CapacitorHttp.post({
      url: 'https://onesignal.com/api/v1/notifications',
      params: {},
      data: {
        app_id: environment.oneSignalID,
        include_external_user_ids: [cliente_id?.toString() || ''],
        headings: { "en": title },
        contents: { "en": body },
        url: url,
      },
      headers: {
        'Content-type': 'application/json',
        'Authorization': `Basic ${environment.oneSignalRestApi}`
      }
    }).then((response: HttpResponse) => {
      console.log(`✅ Notificación a Cliente ${cliente_id} enviada:`, response);
      return response.status === 200;
    }).catch(err => {
      console.error(`❌ Error enviando notificación a Cliente:`, err);
      return false;
    })
  }

}