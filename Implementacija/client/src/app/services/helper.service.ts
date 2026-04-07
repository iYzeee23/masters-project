import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface HelperStep {
  id: string;
  target: string; // CSS selector for spotlight
  title: string;
  titleEn: string;
  content: string;
  contentEn: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const VISUALIZE_STEPS: HelperStep[] = [
  {
    id: 'v-welcome', target: '', position: 'center',
    title: 'Dobrodošli u Visualize!',
    titleEn: 'Welcome to Visualize!',
    content: 'Ovde možete vizualizovati algoritme za pronalaženje puta na gridu. Hajde da prođemo kroz osnove!',
    contentEn: 'Here you can visualize pathfinding algorithms on a grid. Let\'s walk through the basics!',
  },
  {
    id: 'v-algo', target: '[data-help="algorithm"]', position: 'bottom',
    title: 'Izbor algoritma',
    titleEn: 'Algorithm Selection',
    content: 'Izaberite algoritam: BFS, DFS, Dijkstra, A*, Greedy, Swarm i drugi. Svaki ima različite karakteristike.',
    contentEn: 'Choose an algorithm: BFS, DFS, Dijkstra, A*, Greedy, Swarm and more. Each has different characteristics.',
  },
  {
    id: 'v-play', target: '[data-help="playback"]', position: 'bottom',
    title: 'Kontrole reprodukcije',
    titleEn: 'Playback Controls',
    content: '▶ Play pokreće vizualizaciju. ⏸ Pause, ⏭ Step (korak po korak), ⏩ End (preskoči na kraj).',
    contentEn: '▶ Play starts visualization. ⏸ Pause, ⏭ Step (step by step), ⏩ End (skip to end).',
  },
  {
    id: 'v-tools', target: '[data-help="tools"]', position: 'bottom',
    title: 'Alati za crtanje',
    titleEn: 'Drawing Tools',
    content: 'Crtajte na gridu: ▦ Zid (prepreka), ◆ Težina (skuplji teren), ▶ Start, ★ Cilj, ◌ Briši.',
    contentEn: 'Draw on the grid: ▦ Wall (obstacle), ◆ Weight (costly terrain), ▶ Start, ★ Goal, ◌ Erase.',
  },
  {
    id: 'v-speed', target: '[data-help="speed"]', position: 'bottom',
    title: 'Brzina animacije',
    titleEn: 'Animation Speed',
    content: 'Podesite brzinu vizualizacije i koristite slider za premotavanje unapred/unazad.',
    contentEn: 'Adjust visualization speed and use the slider to seek forward/backward.',
  },
  {
    id: 'v-settings', target: '[data-help="settings"]', position: 'bottom',
    title: 'Podešavanja',
    titleEn: 'Settings',
    content: 'Izaberite heuristiku (Manhattan, Euclidean...) i pravce kretanja (4 ili 8 smerova).',
    contentEn: 'Choose heuristic (Manhattan, Euclidean...) and movement directions (4 or 8 directions).',
  },
  {
    id: 'v-maps', target: '[data-help="maps"]', position: 'bottom',
    title: 'Generatori mapa',
    titleEn: 'Map Generators',
    content: 'Automatski generišite mape: lavirint, grad, usko grlo, šumu... Kontrolišite gustinu prepreka.',
    contentEn: 'Auto-generate maps: maze, city, bottleneck, forest... Control obstacle density.',
  },
  {
    id: 'v-ai', target: '[data-help="ai"]', position: 'bottom',
    title: 'AI asistent',
    titleEn: 'AI Assistant',
    content: '✨ Generate: AI pravi mapu po opisu. 🎓 Tutor: analiza algoritma korak po korak. 🏆 Recommend: predlog najboljeg algoritma.',
    contentEn: '✨ Generate: AI creates map from description. 🎓 Tutor: step-by-step algorithm analysis. 🏆 Recommend: best algorithm suggestion.',
  },
  {
    id: 'v-grid', target: 'canvas', position: 'left',
    title: 'Grid — značenje boja',
    titleEn: 'Grid — Color Meaning',
    content: '🔵 Plava = u redu čekanja. 🟣 Ljubičasta = obrađeno. 🟡 Žuta = pronađeni put. Prevlačite start/cilj mišem.',
    contentEn: '🔵 Blue = in queue. 🟣 Purple = processed. 🟡 Yellow = found path. Drag start/goal with mouse.',
  },
];

const COMPARE_STEPS: HelperStep[] = [
  {
    id: 'c-welcome', target: '', position: 'center',
    title: 'Poređenje algoritama',
    titleEn: 'Compare Algorithms',
    content: 'Uporedite performanse svih algoritama na istoj mapi — vidite koliko čvorova svaki obradi i koji je najbrži.',
    contentEn: 'Compare performance of all algorithms on the same map — see how many nodes each processes and which is fastest.',
  },
  {
    id: 'c-sidebar', target: '[data-help="compare-sidebar"]', position: 'right',
    title: 'Kontrolna tabla',
    titleEn: 'Control Panel',
    content: 'Izaberite algoritme koje želite da uporedite, heuristiku i pravce kretanja. Kliknite "Pokreni poređenje" da vidite rezultate.',
    contentEn: 'Select algorithms to compare, heuristic and movement directions. Click "Run Compare" to see the results.',
  },
  {
    id: 'c-run', target: '[data-help="compare-run"]', position: 'right',
    title: 'Pokretanje poređenja',
    titleEn: 'Run Comparison',
    content: 'Nacrtajte zidove na gridu desno, pa kliknite ovo dugme. Rezultati se pojavljuju ispod grida u tabeli sa svim metrikama.',
    contentEn: 'Draw walls on the grid to the right, then click this button. Results appear below the grid in a table with all metrics.',
  },
  {
    id: 'c-grid', target: 'canvas', position: 'left',
    title: 'Grid i rezultati',
    titleEn: 'Grid & Results',
    content: 'Nacrtajte mapu ovde (kliknite za zidove). Nakon pokretanja, tabela ispod prikazuje: broj obrađenih čvorova, cenu puta, vreme izvršavanja.',
    contentEn: 'Draw your map here (click for walls). After running, the table below shows: nodes processed, path cost, execution time.',
  },
];

const PLAYGROUND_STEPS: HelperStep[] = [
  {
    id: 'p-welcome', target: '', position: 'center',
    title: 'Playground',
    titleEn: 'Playground',
    content: 'Pokušajte sami da pronađete najkraći put! Kliknite na ćelije da otkrijete mrežu i pronađete cilj. Dobijate bodove za efikasnost.',
    contentEn: 'Try to find the shortest path yourself! Click on cells to reveal the grid and find the goal. You get scored for efficiency.',
  },
  {
    id: 'p-sidebar', target: '[data-help="playground-sidebar"]', position: 'right',
    title: 'Kontrolna tabla',
    titleEn: 'Control Panel',
    content: 'Ovde vidite svoju statistiku — dužinu puta i cenu. Možete poništiti poslednji potez, resetovati ili proglasiti da put ne postoji.',
    contentEn: 'Here you see your stats — path length and cost. You can undo the last move, reset, or declare that no path exists.',
  },
  {
    id: 'p-grid', target: 'canvas', position: 'left',
    title: 'Otkrijte grid',
    titleEn: 'Explore the Grid',
    content: 'Kliknite na ćelije da otkrijete šta se krije — zid, slobodan prostor ili cilj. Cilj je da stignete od starta (zeleno) do cilja (crveno) sa što manje koraka.',
    contentEn: 'Click cells to reveal what\'s hidden — wall, free space or goal. The goal is to get from start (green) to goal (red) with as few steps as possible.',
  },
];

const ROUTE_STEPS: Record<string, HelperStep[]> = {
  '/visualize': VISUALIZE_STEPS,
  '/compare': COMPARE_STEPS,
  '/playground': PLAYGROUND_STEPS,
};

@Injectable({ providedIn: 'root' })
export class HelperService {
  private steps: HelperStep[] = [];
  private currentIndex = -1;

  readonly isActive$ = new BehaviorSubject<boolean>(false);
  readonly currentStep$ = new BehaviorSubject<HelperStep | null>(null);
  readonly stepNumber$ = new BehaviorSubject<number>(0);
  readonly totalSteps$ = new BehaviorSubject<number>(0);
  readonly spotlightRect$ = new BehaviorSubject<DOMRect | null>(null);

  start(route?: string): void {
    const path = route || window.location.pathname;
    const matchedKey = Object.keys(ROUTE_STEPS).find(k => path.includes(k));
    this.steps = matchedKey ? ROUTE_STEPS[matchedKey] : VISUALIZE_STEPS;

    this.currentIndex = 0;
    this.totalSteps$.next(this.steps.length);
    this.isActive$.next(true);
    this.showStep();
  }

  next(): void {
    if (this.currentIndex < this.steps.length - 1) {
      this.currentIndex++;
      this.showStep();
    } else {
      this.stop();
    }
  }

  prev(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.showStep();
    }
  }

  stop(): void {
    this.currentIndex = -1;
    this.isActive$.next(false);
    this.currentStep$.next(null);
    this.spotlightRect$.next(null);
    this.clearSpotlight();
  }

  isFirst(): boolean {
    return this.currentIndex === 0;
  }

  isLast(): boolean {
    return this.currentIndex === this.steps.length - 1;
  }

  private showStep(): void {
    const step = this.steps[this.currentIndex];
    this.stepNumber$.next(this.currentIndex + 1);
    this.clearSpotlight();

    if (step.target) {
      this.findAndSpotlight(step, 0);
    } else {
      this.spotlightRect$.next(null);
      this.currentStep$.next(step);
    }
  }

  private findAndSpotlight(step: HelperStep, attempt: number): void {
    const el = document.querySelector(step.target) as HTMLElement;
    if (el) {
      el.style.position = 'relative';
      el.style.zIndex = '42';
      el.setAttribute('data-spotlight', 'true');
      this.spotlightRect$.next(el.getBoundingClientRect());
      this.currentStep$.next(step);
    } else if (attempt < 10) {
      // Retry — element might not be rendered yet
      setTimeout(() => this.findAndSpotlight(step, attempt + 1), 50);
    } else {
      this.spotlightRect$.next(null);
      this.currentStep$.next(step);
    }
  }

  private clearSpotlight(): void {
    document.querySelectorAll('[data-spotlight="true"]').forEach(el => {
      (el as HTMLElement).style.zIndex = '';
      el.removeAttribute('data-spotlight');
    });
  }
}
