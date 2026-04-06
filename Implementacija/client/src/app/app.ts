import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from './services/theme.service';
import { TranslationService } from './services/translation.service';
import { HelperService } from './services/helper.service';
import { HelperOverlayComponent } from './components/helper-overlay/helper-overlay.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, HelperOverlayComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  isDark = true;
  langLabel = 'EN';

  constructor(
    public theme: ThemeService,
    public i18n: TranslationService,
    public helper: HelperService,
  ) {}

  ngOnInit(): void {
    this.theme.theme$.subscribe(t => {
      this.isDark = t === 'dark';
    });
    this.i18n.lang$.subscribe(l => {
      this.langLabel = l === 'sr' ? 'EN' : 'SR';
    });
    // Apply initial theme
    this.theme.setTheme(this.theme.getTheme());
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  toggleLang(): void {
    this.i18n.toggle();
  }
}
