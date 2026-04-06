import { Routes } from '@angular/router';
import { VisualizePageComponent } from './pages/visualize/visualize-page.component';
import { ComparePageComponent } from './pages/compare/compare-page.component';
import { PlaygroundPageComponent } from './pages/playground/playground-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'visualize', pathMatch: 'full' },
  { path: 'visualize', component: VisualizePageComponent },
  { path: 'compare', component: ComparePageComponent },
  { path: 'playground', component: PlaygroundPageComponent },
];
