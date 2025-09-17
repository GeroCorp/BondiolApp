import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class PerfilService {
    private perfil: string | null = null;

    setPerfil(perfil: string) {
        this.perfil = perfil;
    }

    getPerfil(): string | null {
        return this.perfil;
    }
}