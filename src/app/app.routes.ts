import { Routes } from '@angular/router';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      { path: '', redirectTo: 'kalkulacka', pathMatch: 'full' },
      {
        path: 'kalkulacka',
        title: 'Kalkulačka výkupu BO! reality',
        loadComponent: () => import('./features/calculator/calculator-page'),
      },
    ],
  },
  { path: '**', redirectTo: 'kalkulacka' },
];
