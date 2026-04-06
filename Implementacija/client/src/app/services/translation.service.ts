import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Language = 'sr' | 'en';

interface Translations {
  [key: string]: string;
}

const SR: Translations = {
  // Header
  'app.title': 'Pathfinding Visualizer',
  'nav.visualize': 'Vizualizacija',
  'nav.compare': 'Poređenje',
  'nav.playground': 'Playground',

  // Controls
  'controls.algorithm': 'Algoritam',
  'controls.heuristic': 'Heuristika',
  'controls.neighbors': 'Susedi',
  'controls.directions4': '4 smera',
  'controls.directions8': '8 smerova',
  'controls.swarmWeight': 'Težinski faktor',
  'controls.tools': 'Alati',
  'controls.speed': 'Brzina',
  'controls.step': 'Korak',

  // Tools
  'tool.wall': '🧱 Zid',
  'tool.weight': '⚖ Težina',
  'tool.start': '▶ Start',
  'tool.goal': '★ Cilj',
  'tool.erase': '🧹 Briši',

  // Playback
  'playback.visualize': '▶ Vizualizuj',
  'playback.resume': '▶ Nastavi',
  'playback.reset': '🔄 Reset vizualizacije',
  'playback.clearMap': '🗑 Očisti mapu',

  // Speed
  'speed.fast': 'Brzo',
  'speed.normal': 'Normalno',
  'speed.slow': 'Sporo',
  'speed.verySlow': 'Veoma sporo',

  // Metrics
  'metrics.title': 'Metrike',
  'metrics.expanded': 'Obrađeno čvorova',
  'metrics.frontier': 'Max frontier',
  'metrics.cost': 'Cena puta',
  'metrics.pathLength': 'Dužina puta',
  'metrics.pathFound': 'Put pronađen',
  'metrics.yes': 'Da ✓',
  'metrics.no': 'Ne ✗',
  'metrics.na': 'N/A',

  // Weight
  'weight.label': 'Težina',

  // Algorithm descriptions
  'algo.bfs': 'BFS',
  'algo.dfs': 'DFS',
  'algo.dijkstra': 'Dijkstra',
  'algo.a_star': 'A*',
  'algo.greedy': 'Greedy Best-First',
  'algo.swarm': 'Swarm',
  'algo.convergent_swarm': 'Convergent Swarm',
  'algo.zero_one_bfs': '0-1 BFS',

  'algo.desc.bfs': 'Širi se sloj po sloj, garantuje najkraći put po broju koraka',
  'algo.desc.dfs': 'Ide u dubinu jednim putem, NE garantuje najkraći put',
  'algo.desc.dijkstra': 'Uzima čvor sa najmanjom cenom g(n), garantuje optimalan put',
  'algo.desc.a_star': 'f(n) = g(n) + h(n) — Dijkstra sa heuristikom, garantuje optimalan put',
  'algo.desc.greedy': 'f(n) = h(n) — samo heuristika, najbrži ali često neoptimalan',
  'algo.desc.swarm': 'f(n) = g(n) + w₁·h(n) — kompromis između A* i Greedy (w₁ > 1)',
  'algo.desc.convergent_swarm': 'f(n) = g(n) + w₂·h(n) — agresivnija varijanta Swarm (w₂ > w₁)',
  'algo.desc.zero_one_bfs': 'Specijalizovan za težine {0, 1} — koristi deque, brži od Dijkstre',

  // Heuristics
  'heuristic.manhattan': 'Manhattan',
  'heuristic.euclidean': 'Euclidean',
  'heuristic.chebyshev': 'Chebyshev',
  'heuristic.octile': 'Octile',

  // Theme
  'theme.dark': '🌙',
  'theme.light': '☀️',

  // Language
  'lang.sr': 'SR',
  'lang.en': 'EN',
};

const EN: Translations = {
  // Header
  'app.title': 'Pathfinding Visualizer',
  'nav.visualize': 'Visualize',
  'nav.compare': 'Compare',
  'nav.playground': 'Playground',

  // Controls
  'controls.algorithm': 'Algorithm',
  'controls.heuristic': 'Heuristic',
  'controls.neighbors': 'Neighbors',
  'controls.directions4': '4 directions',
  'controls.directions8': '8 directions',
  'controls.swarmWeight': 'Weight factor',
  'controls.tools': 'Tools',
  'controls.speed': 'Speed',
  'controls.step': 'Step',

  // Tools
  'tool.wall': '🧱 Wall',
  'tool.weight': '⚖ Weight',
  'tool.start': '▶ Start',
  'tool.goal': '★ Goal',
  'tool.erase': '🧹 Erase',

  // Playback
  'playback.visualize': '▶ Visualize',
  'playback.resume': '▶ Resume',
  'playback.reset': '🔄 Reset visualization',
  'playback.clearMap': '🗑 Clear map',

  // Speed
  'speed.fast': 'Fast',
  'speed.normal': 'Normal',
  'speed.slow': 'Slow',
  'speed.verySlow': 'Very slow',

  // Metrics
  'metrics.title': 'Metrics',
  'metrics.expanded': 'Expanded nodes',
  'metrics.frontier': 'Max frontier',
  'metrics.cost': 'Path cost',
  'metrics.pathLength': 'Path length',
  'metrics.pathFound': 'Path found',
  'metrics.yes': 'Yes ✓',
  'metrics.no': 'No ✗',
  'metrics.na': 'N/A',

  // Weight
  'weight.label': 'Weight',

  // Algorithm names
  'algo.bfs': 'BFS',
  'algo.dfs': 'DFS',
  'algo.dijkstra': 'Dijkstra',
  'algo.a_star': 'A*',
  'algo.greedy': 'Greedy Best-First',
  'algo.swarm': 'Swarm',
  'algo.convergent_swarm': 'Convergent Swarm',
  'algo.zero_one_bfs': '0-1 BFS',

  'algo.desc.bfs': 'Expands layer by layer, guarantees shortest path by step count',
  'algo.desc.dfs': 'Goes deep along one path, does NOT guarantee shortest path',
  'algo.desc.dijkstra': 'Picks node with lowest cost g(n), guarantees optimal path',
  'algo.desc.a_star': 'f(n) = g(n) + h(n) — Dijkstra with heuristic, guarantees optimal path',
  'algo.desc.greedy': 'f(n) = h(n) — heuristic only, fastest but often suboptimal',
  'algo.desc.swarm': 'f(n) = g(n) + w₁·h(n) — compromise between A* and Greedy (w₁ > 1)',
  'algo.desc.convergent_swarm': 'f(n) = g(n) + w₂·h(n) — more aggressive Swarm variant (w₂ > w₁)',
  'algo.desc.zero_one_bfs': 'Specialized for {0, 1} weights — uses deque, faster than Dijkstra',

  // Heuristics
  'heuristic.manhattan': 'Manhattan',
  'heuristic.euclidean': 'Euclidean',
  'heuristic.chebyshev': 'Chebyshev',
  'heuristic.octile': 'Octile',

  // Theme
  'theme.dark': '🌙',
  'theme.light': '☀️',

  // Language
  'lang.sr': 'SR',
  'lang.en': 'EN',
};

const TRANSLATIONS: Record<Language, Translations> = { sr: SR, en: EN };

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private currentLang: Language = 'sr';
  readonly lang$ = new BehaviorSubject<Language>('sr');

  constructor() {
    const saved = localStorage.getItem('pf-lang') as Language | null;
    if (saved) {
      this.setLanguage(saved);
    }
  }

  t(key: string): string {
    return TRANSLATIONS[this.currentLang][key] ?? key;
  }

  getLanguage(): Language {
    return this.currentLang;
  }

  setLanguage(lang: Language): void {
    this.currentLang = lang;
    this.lang$.next(lang);
    localStorage.setItem('pf-lang', lang);
  }

  toggle(): void {
    this.setLanguage(this.currentLang === 'sr' ? 'en' : 'sr');
  }
}
