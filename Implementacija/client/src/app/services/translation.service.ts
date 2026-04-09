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
  'header.help': 'Pomoć',
  'header.dark': 'Tamna',
  'header.light': 'Svetla',
  'header.signout': 'Odjava',

  // Auth
  'auth.firstName': 'Ime',
  'auth.lastName': 'Prezime',
  'auth.username': 'Korisničko ime',
  'auth.email': 'Email',
  'auth.password': 'Lozinka',
  'auth.confirmPassword': 'Potvrdi lozinku',
  'auth.signIn': 'Prijavi se',
  'auth.createAccount': 'Kreiraj nalog',
  'auth.switchToSignUp': 'Kreiraj nalog',
  'auth.switchToSignIn': 'Prijavi se',
  'auth.passwordsMismatch': 'Lozinke se ne poklapaju',
  'auth.fillAllFields': 'Popunite sva polja',
  'auth.invalidCredentials': 'Pogrešni kredencijali',
  'auth.registrationFailed': 'Registracija neuspešna',
  'auth.passwordMinLength': 'Lozinka mora imati najmanje 6 karaktera',

  // Profile
  'profile.statistics': '📊 Statistika',
  'profile.totalRuns': 'Ukupno pokretanja',
  'profile.savedMaps': 'Sačuvane mape',
  'profile.totalScore': 'Ukupni skor',
  'profile.leaderboard': '🏆 Leaderboard',
  'profile.noEntries': 'Nema unosa',
  'profile.changeAvatar': '📷 Promeni avatar',
  'profile.uploading': 'Otpremanje...',
  'profile.signOut': 'Odjavi se',
  'profile.memberSince': 'Član od',

  // Toolbar
  'toolbar.play': '▶ Pokreni',
  'toolbar.pause': '⏸ Pauza',
  'toolbar.step': '⏭ Korak',
  'toolbar.end': '⏩ Kraj',
  'toolbar.speed': '⚡ Brzina',
  'toolbar.animSpeed': 'Brzina animacije',
  'toolbar.maps': '🗺 Mape',
  'toolbar.density': 'Gustina',
  'toolbar.ai': '✦ AI',
  'toolbar.settings': '⚙ Podešavanja',
  'toolbar.heuristic': 'Heuristika',
  'toolbar.neighbors': 'Susedi',
  'toolbar.weight': 'Težina',
  'toolbar.reset': '↺ Reset',
  'toolbar.clear': '✕ Obriši',
  'toolbar.export': 'Izvoz ↓',
  'toolbar.nodes': 'čvorovi',
  'toolbar.cost': 'cena',
  'toolbar.best': 'Najbolji:',
  'toolbar.worst': 'Najgori:',
  'toolbar.analyzing': 'Analiziranje...',
  'toolbar.analyzeSteps': '🎓 Analiziraj korake',
  'toolbar.generating': 'Generisanje...',
  'toolbar.generateMap': '✨ Generiši mapu',
  'toolbar.recommendAlgo': '🏆 Preporuči algoritam',
  'toolbar.aiPlaceholder': 'npr. lavirint gde A* ima problema...',

  // Compare
  'compare.run': '▶ Pokreni poređenje',
  'compare.running': '⏳ ...',
  'compare.selectAll': 'Izaberi sve',
  'compare.algorithm': 'Algoritam',
  'compare.expanded': 'Obrađeno',
  'compare.maxFrontier': 'Max Frontier',
  'compare.pathCost': 'Cena puta',
  'compare.pathLength': 'Dužina',
  'compare.time': 'Vreme (ms)',
  'compare.path': 'Put',
  'compare.settingsHint': 'Heuristika usmerava pretragu ka cilju. Broj suseda odre\u0111uje smerove kretanja (4 = gore/dole/levo/desno, 8 = + dijagonale).',

  // Playground
  'playground.instructions': 'Pokušaj da pronađeš najkraći put! Klikni na ćelije od starta do cilja.',
  'playground.instructions2': 'Ili označi da put ne postoji.',
  'playground.yourPath': 'Tvoj put:',
  'playground.cells': 'ćelija',
  'playground.cost': 'Cena:',
  'playground.noPath': '✗ Put ne postoji',
  'playground.submit': '✓ Predaj rešenje',
  'playground.undo': '↩ Poništi poslednji',
  'playground.resetBtn': '🔄 Resetuj',
  'playground.score': 'Skor:',
  'playground.yourCost': 'Tvoja cena:',
  'playground.optimalCost': 'Optimalna cena:',
  'playground.penaltyCost': 'Penali (cena):',
  'playground.penaltyMoves': 'Penali (potezi):',
  'playground.noPathExists': 'Nema puta',
  'playground.speedBonus': 'Bonus (brzina):',

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
  'tool.wall': '▦ Zid',
  'tool.weight': '◆ Težina',
  'tool.start': '▶ Start',
  'tool.goal': '★ Cilj',
  'tool.erase': '◌ Briši',

  // Algorithm descriptions
  'algo.desc.bfs': 'Širi se sloj po sloj, garantuje najkraći put po broju koraka',
  'algo.desc.dfs': 'Ide u dubinu jednim putem, NE garantuje najkraći put',
  'algo.desc.dijkstra': 'Uzima čvor sa najmanjom cenom g(n), garantuje optimalan put',
  'algo.desc.a_star': 'f(n) = g(n) + h(n) — Dijkstra sa heuristikom, garantuje optimalan put',
  'algo.desc.greedy': 'f(n) = h(n) — samo heuristika, najbrži ali često neoptimalan',
  'algo.desc.swarm': 'f(n) = g(n) + w₁·h(n) — kompromis između A* i Greedy (w₁ > 1)',
  'algo.desc.convergent_swarm': 'f(n) = g(n) + w₂·h(n) — agresivnija varijanta Swarm (w₂ > w₁)',
  'algo.desc.zero_one_bfs': 'Specijalizovan za težine {0, 1} — koristi deque, brži od Dijkstre',

  // AI Panel
  'ai.title': 'AI Asistent',
  'ai.analyzing': 'Analiziram...',
  'ai.generating': 'Generišem...',
  'ai.confidence': 'Pouzdanost:',
  'ai.mapGenerated': 'Mapa generisana!',
  'ai.density': 'Gustina:',
  'ai.seed': 'Seed:',

  // Helper
  'helper.back': '← Nazad',
  'helper.next': 'Dalje →',
  'helper.finish': 'Završi',

  // Dynamic modes
  'toolbar.reResolve': '↻ Ponovo reši',

  // Legend
  'legend.title': 'Legenda',
  'legend.open': 'Otvoreni',
  'legend.closed': 'Zatvoreni',
  'legend.current': 'Trenutni',
  'legend.path': 'Put',
  'legend.wall': 'Zid',
  'legend.start': 'Start',
  'legend.goal': 'Cilj',
  'legend.metrics': 'Metrike',
  'legend.found': 'Put',
  'legend.length': 'Dužina',
  'legend.time': 'Vreme',

  'toolbar.saveMap': '💾 Sačuvaj mapu',
  'toolbar.loadMap': '📂 Učitaj mapu',
  'toolbar.mapSaved': 'Mapa sačuvana!',
  'toolbar.mapName': 'Naziv mape',
  'toolbar.mapNamePlaceholder': 'Moja mapa...',
  'toolbar.makePublic': 'Javna mapa',
  'toolbar.save': 'Sačuvaj',
  'toolbar.cancel': 'Otkaži',
  'toolbar.myMaps': 'Moje mape',
  'toolbar.publicMaps': 'Javne mape',
  'toolbar.noMaps': 'Nema sačuvanih mapa',
  'toolbar.delete': 'Obriši',
  'compare.insight': '✦ AI Uvid',
  'compare.insightLoading': 'Analiziram rezultate...',
  'compare.algos': 'Algoritmi',
  'compare.bestNodes': 'Najbolji čvorovi',
  'compare.bestCost': 'Najbolja cena',
  'compare.bestTime': 'Najbolje vreme',
};

const EN: Translations = {
  // Header
  'app.title': 'Pathfinding Visualizer',
  'nav.visualize': 'Visualize',
  'nav.compare': 'Compare',
  'nav.playground': 'Playground',
  'header.help': 'Help',
  'header.dark': 'Dark',
  'header.light': 'Light',
  'header.signout': 'Sign Out',

  // Auth
  'auth.firstName': 'First name',
  'auth.lastName': 'Last name',
  'auth.username': 'Username',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.confirmPassword': 'Confirm password',
  'auth.signIn': 'Sign in',
  'auth.createAccount': 'Create account',
  'auth.switchToSignUp': 'Create an account',
  'auth.switchToSignIn': 'Sign in instead',
  'auth.passwordsMismatch': 'Passwords do not match',
  'auth.fillAllFields': 'Please fill in all fields',
  'auth.invalidCredentials': 'Invalid credentials',
  'auth.registrationFailed': 'Registration failed',
  'auth.passwordMinLength': 'Password must be at least 6 characters',

  // Profile
  'profile.statistics': '📊 Statistics',
  'profile.totalRuns': 'Total Runs',
  'profile.savedMaps': 'Saved Maps',
  'profile.totalScore': 'Total Score',
  'profile.leaderboard': '🏆 Leaderboard',
  'profile.noEntries': 'No entries yet',
  'profile.changeAvatar': '📷 Change avatar',
  'profile.uploading': 'Uploading...',
  'profile.signOut': 'Sign Out',
  'profile.memberSince': 'Member since',

  // Toolbar
  'toolbar.play': '▶ Play',
  'toolbar.pause': '⏸ Pause',
  'toolbar.step': '⏭ Step',
  'toolbar.end': '⏩ End',
  'toolbar.speed': '⚡ Speed',
  'toolbar.animSpeed': 'Animation Speed',
  'toolbar.maps': '🗺 Maps',
  'toolbar.density': 'Density',
  'toolbar.ai': '✦ AI',
  'toolbar.settings': '⚙ Settings',
  'toolbar.heuristic': 'Heuristic',
  'toolbar.neighbors': 'Neighbors',
  'toolbar.weight': 'Weight',
  'toolbar.reset': '↺ Reset',
  'toolbar.clear': '✕ Clear',
  'toolbar.export': 'Export ↓',
  'toolbar.nodes': 'nodes',
  'toolbar.cost': 'cost',
  'toolbar.best': 'Best:',
  'toolbar.worst': 'Worst:',
  'toolbar.analyzing': 'Analyzing...',
  'toolbar.analyzeSteps': '🎓 Analyze Steps',
  'toolbar.generating': 'Generating...',
  'toolbar.generateMap': '✨ Generate Map',
  'toolbar.recommendAlgo': '🏆 Recommend Algorithm',
  'toolbar.aiPlaceholder': 'e.g. maze where A* struggles...',

  // Compare
  'compare.run': '▶ Run Comparison',
  'compare.running': '⏳ ...',
  'compare.selectAll': 'Select All',
  'compare.algorithm': 'Algorithm',
  'compare.expanded': 'Expanded',
  'compare.maxFrontier': 'Max Frontier',
  'compare.pathCost': 'Path Cost',
  'compare.pathLength': 'Length',
  'compare.time': 'Time (ms)',
  'compare.path': 'Path',
  'compare.settingsHint': 'Heuristic guides the search toward the goal. Neighbor count determines movement directions (4 = cardinal, 8 = with diagonals).',

  // Playground
  'playground.instructions': 'Try to find the shortest path! Click on cells from start to goal.',
  'playground.instructions2': 'Or declare that no path exists.',
  'playground.yourPath': 'Your path:',
  'playground.cells': 'cells',
  'playground.cost': 'Cost:',
  'playground.noPath': '✗ No path exists',
  'playground.submit': '✓ Submit solution',
  'playground.undo': '↩ Undo last',
  'playground.resetBtn': '🔄 Reset',
  'playground.score': 'Score:',
  'playground.yourCost': 'Your cost:',
  'playground.optimalCost': 'Optimal cost:',
  'playground.penaltyCost': 'Penalty (cost):',
  'playground.penaltyMoves': 'Penalty (moves):',
  'playground.noPathExists': 'No path',
  'playground.speedBonus': 'Bonus (speed):',

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
  'tool.wall': '▦ Wall',
  'tool.weight': '◆ Weight',
  'tool.start': '▶ Start',
  'tool.goal': '★ Goal',
  'tool.erase': '◌ Erase',

  // Algorithm descriptions
  'algo.desc.bfs': 'Expands layer by layer, guarantees shortest path by step count',
  'algo.desc.dfs': 'Goes deep along one path, does NOT guarantee shortest path',
  'algo.desc.dijkstra': 'Picks node with lowest cost g(n), guarantees optimal path',
  'algo.desc.a_star': 'f(n) = g(n) + h(n) — Dijkstra with heuristic, guarantees optimal path',
  'algo.desc.greedy': 'f(n) = h(n) — heuristic only, fastest but often suboptimal',
  'algo.desc.swarm': 'f(n) = g(n) + w₁·h(n) — compromise between A* and Greedy (w₁ > 1)',
  'algo.desc.convergent_swarm': 'f(n) = g(n) + w₂·h(n) — more aggressive Swarm variant (w₂ > w₁)',
  'algo.desc.zero_one_bfs': 'Specialized for {0, 1} weights — uses deque, faster than Dijkstra',

  // AI Panel
  'ai.title': 'AI Assistant',
  'ai.analyzing': 'Analyzing...',
  'ai.generating': 'Generating...',
  'ai.confidence': 'Confidence:',
  'ai.mapGenerated': 'Map generated!',
  'ai.density': 'Density:',
  'ai.seed': 'Seed:',

  // Helper
  'helper.back': '← Back',
  'helper.next': 'Next →',
  'helper.finish': 'Finish',

  // Dynamic modes
  'toolbar.reResolve': '↻ Re-solve',

  // Legend
  'legend.title': 'Legend',
  'legend.open': 'Open',
  'legend.closed': 'Closed',
  'legend.current': 'Current',
  'legend.path': 'Path',
  'legend.wall': 'Wall',
  'legend.start': 'Start',
  'legend.goal': 'Goal',
  'legend.metrics': 'Metrics',
  'legend.found': 'Path',
  'legend.length': 'Length',
  'legend.time': 'Time',

  'toolbar.saveMap': '💾 Save Map',
  'toolbar.loadMap': '📂 Load Map',
  'toolbar.mapSaved': 'Map saved!',
  'toolbar.mapName': 'Map name',
  'toolbar.mapNamePlaceholder': 'My map...',
  'toolbar.makePublic': 'Public map',
  'toolbar.save': 'Save',
  'toolbar.cancel': 'Cancel',
  'toolbar.myMaps': 'My Maps',
  'toolbar.publicMaps': 'Public Maps',
  'toolbar.noMaps': 'No saved maps',
  'toolbar.delete': 'Delete',
  'compare.insight': '✦ AI Insight',
  'compare.insightLoading': 'Analyzing results...',
  'compare.algos': 'Algorithms',
  'compare.bestNodes': 'Best nodes',
  'compare.bestCost': 'Best cost',
  'compare.bestTime': 'Best time',
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
