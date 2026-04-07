import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from './services/theme.service';
import { TranslationService } from './services/translation.service';
import { HelperService } from './services/helper.service';
import { AuthService, UserProfile } from './services/auth.service';
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
  isLoggedIn = false;
  user: UserProfile | null = null;

  constructor(
    public theme: ThemeService,
    public i18n: TranslationService,
    public helper: HelperService,
    public auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.theme.theme$.subscribe(t => this.isDark = t === 'dark');
    this.i18n.lang$.subscribe(l => this.langLabel = l === 'sr' ? 'EN' : 'SR');
    this.auth.isLoggedIn$.subscribe(v => this.isLoggedIn = v);
    this.auth.user$.subscribe(u => this.user = u);
    this.theme.setTheme(this.theme.getTheme());
  }

  toggleTheme(): void { this.theme.toggle(); }
  toggleLang(): void { this.i18n.toggle(); }
}
