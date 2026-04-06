import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface HelperStep {
  id: string;
  target: string; // CSS selector or area name
  title: string;
  titleEn: string;
  content: string;
  contentEn: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const HELPER_STEPS: HelperStep[] = [
  {
    id: 'welcome',
    target: 'header',
    title: 'Dobrodošli!',
    titleEn: 'Welcome!',
    content: 'Ovo je Pathfinding Visualizer — interaktivna aplikacija za vizualizaciju algoritama za pronalaženje puta. Hajde da prođemo kroz osnove!',
    contentEn: 'This is Pathfinding Visualizer — an interactive app for visualizing pathfinding algorithms. Let\'s go through the basics!',
    position: 'bottom',
  },
  {
    id: 'grid',
    target: 'canvas',
    title: 'Grid (mreža)',
    titleEn: 'Grid',
    content: 'Ovo je grid na kome će algoritam tražiti put. Zeleni čvor (▶) je start, crveni (★) je cilj. Možete ih prevlačiti mišem.',
    contentEn: 'This is the grid where the algorithm searches for a path. Green node (▶) is start, red (★) is goal. You can drag them with your mouse.',
    position: 'left',
  },
  {
    id: 'tools',
    target: 'tools',
    title: 'Alati za crtanje',
    titleEn: 'Drawing Tools',
    content: 'Izaberite alat i crtajte na gridu: 🧱 Zid (prepreka), ⚖ Težina (skuplji teren), ili 🧹 Briši za brisanje.',
    contentEn: 'Select a tool and draw on the grid: 🧱 Wall (obstacle), ⚖ Weight (costly terrain), or 🧹 Erase to clear.',
    position: 'right',
  },
  {
    id: 'algorithm',
    target: 'algorithm-select',
    title: 'Izbor algoritma',
    titleEn: 'Algorithm Selection',
    content: 'Izaberite algoritam koji želite da vizualizujete. Svaki ima različite karakteristike — neki garantuju najkraći put, neki su brži ali neoptimalni.',
    contentEn: 'Choose the algorithm you want to visualize. Each has different characteristics — some guarantee shortest path, some are faster but suboptimal.',
    position: 'right',
  },
  {
    id: 'playback',
    target: 'playback',
    title: 'Kontrole reprodukcije',
    titleEn: 'Playback Controls',
    content: '▶ Pokreni vizualizaciju, ⏸ Pauziraj, ⏭ Korak po korak, ⏩ Preskoči na kraj. Slider ispod kontroliše brzinu.',
    contentEn: '▶ Start visualization, ⏸ Pause, ⏭ Step by step, ⏩ Skip to end. The slider below controls speed.',
    position: 'right',
  },
  {
    id: 'colors',
    target: 'canvas',
    title: 'Značenje boja',
    titleEn: 'Color Meaning',
    content: '🔵 Plava = u redu čekanja (frontier/open). 🟣 Ljubičasta = potpuno obrađen (closed). 🟡 Žuta = pronađeni najkraći put. 🟠 Narandžasta = trenutni čvor.',
    contentEn: '🔵 Blue = in queue (frontier/open). 🟣 Purple = fully processed (closed). 🟡 Yellow = found shortest path. 🟠 Orange = current node.',
    position: 'left',
  },
  {
    id: 'nav',
    target: 'nav',
    title: 'Režimi rada',
    titleEn: 'Modes',
    content: 'Vizualizacija = osnovni mod. Poređenje = uporedi sve algoritme na istoj mapi. Playground = pokušaj sam da pronađeš put i dobij bodove!',
    contentEn: 'Visualize = basic mode. Compare = compare all algorithms on the same map. Playground = try to find the path yourself and get scored!',
    position: 'bottom',
  },
  {
    id: 'ai',
    target: 'ai-panel',
    title: 'AI & Generatori',
    titleEn: 'AI & Generators',
    content: 'Generišite mape (lavirint, grad, usko grlo...) ili koristite AI za analizu algoritma, generisanje mapa po opisu, i preporuku najboljeg algoritma.',
    contentEn: 'Generate maps (maze, city, bottleneck...) or use AI to analyze the algorithm, generate maps from description, and recommend the best algorithm.',
    position: 'right',
  },
];

@Injectable({ providedIn: 'root' })
export class HelperService {
  private steps = HELPER_STEPS;
  private currentIndex = -1;

  readonly isActive$ = new BehaviorSubject<boolean>(false);
  readonly currentStep$ = new BehaviorSubject<HelperStep | null>(null);
  readonly stepNumber$ = new BehaviorSubject<number>(0);
  readonly totalSteps$ = new BehaviorSubject<number>(HELPER_STEPS.length);

  start(): void {
    this.currentIndex = 0;
    this.isActive$.next(true);
    this.currentStep$.next(this.steps[0]);
    this.stepNumber$.next(1);
  }

  next(): void {
    if (this.currentIndex < this.steps.length - 1) {
      this.currentIndex++;
      this.currentStep$.next(this.steps[this.currentIndex]);
      this.stepNumber$.next(this.currentIndex + 1);
    } else {
      this.stop();
    }
  }

  prev(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.currentStep$.next(this.steps[this.currentIndex]);
      this.stepNumber$.next(this.currentIndex + 1);
    }
  }

  stop(): void {
    this.currentIndex = -1;
    this.isActive$.next(false);
    this.currentStep$.next(null);
  }

  isFirst(): boolean {
    return this.currentIndex === 0;
  }

  isLast(): boolean {
    return this.currentIndex === this.steps.length - 1;
  }
}
