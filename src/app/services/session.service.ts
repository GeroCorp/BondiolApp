import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface UserSession {
  id: string;
  email: string;
  userType: 'empleado' | 'cliente';
  profile: string;
  lastLogin: string;
  clientData?: any;
}

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private sessionSubject = new BehaviorSubject<UserSession | null>(null);
  public session$ = this.sessionSubject.asObservable();

  constructor() {
    this.loadSessionFromStorage();
  }

  private loadSessionFromStorage() {
    const saved = localStorage.getItem('userSession');
    if (saved) {
      try {
        const session = JSON.parse(saved);
        this.sessionSubject.next(session);
      } catch (error) {
        console.error('Error parsing saved session:', error);
        localStorage.removeItem('userSession');
      }
    }
  }

  updateSession(session: UserSession) {
    localStorage.setItem('userSession', JSON.stringify(session));
    this.sessionSubject.next(session);
  }

  clearSession() {
    localStorage.removeItem('userSession');
    this.sessionSubject.next(null);
  }

  getCurrentSession(): UserSession | null {
    return this.sessionSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.sessionSubject.value;
  }

  isEmployeeType(): boolean {
    const session = this.getCurrentSession();
    return session?.userType === 'empleado';
  }

  isClientType(): boolean {
    const session = this.getCurrentSession();
    return session?.userType === 'cliente';
  }

  getProfile(): string | null {
    const session = this.getCurrentSession();
    return session?.profile || null;
  }
}