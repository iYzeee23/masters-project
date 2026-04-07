import { Routes } from '@angular/router';
import { VisualizePageComponent } from './pages/visualize/visualize-page.component';
import { ComparePageComponent } from './pages/compare/compare-page.component';
import { PlaygroundPageComponent } from './pages/playground/playground-page.component';
import { AuthPageComponent } from './pages/auth/auth-page.component';
import { ProfilePageComponent } from './pages/profile/profile-page.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'visualize', pathMatch: 'full' },
  { path: 'auth', component: AuthPageComponent },
  { path: 'visualize', component: VisualizePageComponent, canActivate: [authGuard] },
  { path: 'compare', component: ComparePageComponent, canActivate: [authGuard] },
  { path: 'playground', component: PlaygroundPageComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfilePageComponent, canActivate: [authGuard] },
];
