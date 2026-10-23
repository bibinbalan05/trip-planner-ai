import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Trip Planner AI',
    // Lazy-loaded so future feature areas (saved trips, account, ...) stay out of the initial bundle.
    loadComponent: () => import('./features/chat/chat.component').then((m) => m.ChatComponent),
  },
  { path: '**', redirectTo: '' },
];
