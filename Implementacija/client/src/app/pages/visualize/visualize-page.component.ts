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
    <div style="display: flex; align-items: center; justify-content: center; height: calc(100vh - 140px);">
      <app-grid></app-grid>
    </div>
  `,
})
export class VisualizePageComponent {}
