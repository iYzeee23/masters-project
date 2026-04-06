import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridComponent } from '../../components/grid/grid.component';
import { ControlsComponent } from '../../components/controls/controls.component';
import { AIPanelComponent } from '../../components/ai-panel/ai-panel.component';

@Component({
  selector: 'app-visualize-page',
  standalone: true,
  imports: [CommonModule, GridComponent, ControlsComponent, AIPanelComponent],
  template: `
    <div class="flex gap-4 p-4 max-w-screen-2xl mx-auto">
      <aside class="w-72 flex-shrink-0 max-h-[calc(100vh-80px)] overflow-y-auto">
        <app-controls></app-controls>
        <app-ai-panel></app-ai-panel>
      </aside>
      <section class="flex-1 flex items-start justify-center">
        <app-grid></app-grid>
      </section>
    </div>
  `,
})
export class VisualizePageComponent {}
