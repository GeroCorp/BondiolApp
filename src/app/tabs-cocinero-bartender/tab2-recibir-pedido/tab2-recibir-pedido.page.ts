import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/supabase';
import { ConcinaBar } from 'src/app/services/concina-bar';

@Component({
  selector: 'app-tab2-recibir-pedido',
  templateUrl: './tab2-recibir-pedido.page.html',
  styleUrls: ['./tab2-recibir-pedido.page.scss'],
  standalone: false
})
export class Tab2RecibirPedidoPage implements OnInit {
  perfil: string | null = null;
  pedidos: any[] = [];
  isLoading = true;
  tabSeleccionado: 'pendientes' | 'preparacion' = 'pendientes';

  constructor(
    private supabaseService: AuthService,
    private cocinaBarService: ConcinaBar
  ) {}

  async ngOnInit() {
    // Suponiendo que el perfil se obtiene de la sesión actual
    const usuario = await this.supabaseService.getUsuarioConPerfil();
    this.perfil = usuario?.perfil ?? null;
    await this.cargarPedidosPendientes();
  }

  async handleRefresh(event: any) {
    await this.cargarPedidosPendientes();
    event.target.complete();
  }

  async cargarPedidosPendientes() {
    //REVISAR PORQUE CREO QUE HAY ALGO QUE SE PISA
      this.isLoading = true;
      let sector: 'cocina' | 'bar' | null = null;
      if (this.perfil === 'cocinero') sector = 'cocina';
      if (this.perfil === 'bartender') sector = 'bar';
      if (sector) {
        try {
          const pedidos = await this.cocinaBarService.getPedidosPendientesSector(sector);
          this.pedidos = pedidos || [];
          this.pedidos.forEach(pedido => {
            if (!pedido.estadoItem) {
              pedido.estadoItem = 'confirmado';
            }
            //aca viene una funcion que te ordena los pedidos para que el listo se vaya al finaal , no estoy segura que ande super bien por el async
          })
          
        } catch (error) {
          console.error('Error al cargar pedidos pendientes:', error);
        }
        this.handleItems();
        console.log(this.pedidos);
      }
      this.isLoading = false;
    }

  handleItems(){
    this.pedidos.forEach(pedido => {
      try {
        // Si items es un string, procesarlo
        if (typeof pedido.items === 'string') {
          const itemsString = pedido.items.trim();
          
          // Intentar parsear como JSON primero
          if (itemsString.startsWith('[') && itemsString.endsWith(']')) {
            pedido.items = JSON.parse(itemsString);
          } 
          // Si no es JSON, tratar como texto separado por comas
          else if (itemsString.length > 0) {
            pedido.items = itemsString.split(',').map((item: string) => item.trim());
          } 
          // String vacío
          else {
            pedido.items = [];
          }
        }
        // Si ya es un array, mantenerlo como está
        else if (!Array.isArray(pedido.items)) {
          // Si no es ni string ni array, inicializar como array vacío
          pedido.items = [];
        }
      } catch (error) {
        console.error('Error al parsear items del pedido:', error);
        console.log('Items original:', pedido.items);
        
        // Fallback: intentar split por comas si es string
        if (typeof pedido.items === 'string') {
          pedido.items = pedido.items.split(',').map((item: string) => item.trim()).filter((item: string) => item.length > 0);
        } else {
          pedido.items = []; // Fallback a array vacío
        }
      }
    });
  }

  // Función para obtener el color del badge según el estado
  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return 'warning';
      case 'confirmado':
        return 'danger';
      case 'en_preparación':
        return 'secondary';
      case 'listo':
        return 'success';
      case 'entregado':
        return 'dark';
      default:
        return 'medium';
    }
  }

  // Función para marcar pedido del sector como listo
  async actualizarEstado(pedidoSector: any, estado: 'en_preparación' | 'listo') {
    try {
      console.log(pedidoSector);
      // Actualizar el estado del pedido sector a 'en preparación'
      const res = await this.cocinaBarService.actualizarEstadoPedidoSector(pedidoSector.id, estado);

      console.log(res);

      // Recargar la lista de pedidos
      await this.cargarPedidosPendientes();
      
      console.log('Pedido marcado como listo:', pedidoSector.id);
    } catch (error) {
      console.error('Error al marcar pedido como listo:', error);
    }
  }

get pedidosPendientes() {
  return this.pedidos.filter(p => p.estadoItem === 'confirmado');
}

get pedidosPreparacion() {
  return this.pedidos.filter(p => p.estadoItem === 'en_preparación');
}

get pagesPendientes() {
  return this.chunkArray(this.pedidosPendientes, 3);
}

get pagesPreparacion() {
  return this.chunkArray(this.pedidosPreparacion, 3);
}

chunkArray(arr: any[], size: number) {
  const p: any[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    p.push(arr.slice(i, i + size));
  }
  return p;
}

trackByIndex(index: number) {
  return index;
}

trackByPedidoId(_index: number, pedido: any) {
  return pedido.id || _index;
}
}