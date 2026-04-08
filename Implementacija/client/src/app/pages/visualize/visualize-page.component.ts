import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridComponent } from '../../components/grid/grid.component';
import { ToolbarComponent } from '../../components/toolbar/toolbar.component';

@Component({
  selector: 'app-visualize-page',
  standalone: true,
  imports: [CommonModule, GridComponent, ToolbarComponent],
  template: `
    <app-toolbar></app-toolbar>
    <div style="display: flex; align-items: start; justify-content: center; padding: 24px 48px; min-height: calc(100vh - 200px);">
      <app-grid></app-grid>
    </div>
  `,
})
export class VisualizePageComponent {}
