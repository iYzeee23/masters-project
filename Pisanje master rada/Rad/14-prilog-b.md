# Најважнији делови програмског кода

У овом прилогу наведени су делови кода који су у тексту рада поменути, али нису у целости приказани. Наводе се само делови суштински за разумевање решења, док је потпун изворни код доступан уз рад.

## Јединствени интерфејс алгоритма

Сваки од осам алгоритама реализује интерфејс приказан у наставку, чиме је постигнуто раздвајање описано у одељку 4.2. Метода за корак извршава једну логичку операцију и враћа списак насталих догађаја, што омогућава да приказ буде потпуно независан од врсте алгоритма.

```typescript
export interface PathfindingAlgorithm {
  init(grid: Grid, start: Position, goal: Position,
       options: AlgorithmOptions): void;
  step(): AlgorithmEvent[];
  isDone(): boolean;
  getResult(): AlgorithmResult | null;
  getTrace(): AlgorithmEvent[];
}
```

## Хеуристичке функције и цена прелаза

Све четири хеуристике реализоване су у једној функцији, чиме се позивно место не мења при промени избора. Октилна хеуристика записана је у облику који је алгебарски једнак изразу 2.6.4, али захтева једно рачунање мање. Функција за цену прелаза одговара изразу 2.1.2.

```typescript
export function heuristic(a: Position, b: Position, type: HeuristicType): number {
  const dx = Math.abs(a.col - b.col);
  const dy = Math.abs(a.row - b.row);
  switch (type) {
    case HeuristicType.MANHATTAN: return dx + dy;
    case HeuristicType.EUCLIDEAN: return Math.sqrt(dx * dx + dy * dy);
    case HeuristicType.CHEBYSHEV: return Math.max(dx, dy);
    case HeuristicType.OCTILE:    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
  }
}

export function getMoveCost(grid: Grid, from: Position, to: Position): number {
  const isDiagonal = from.row !== to.row && from.col !== to.col;
  const weight = grid.cells[to.row][to.col].weight;
  return isDiagonal ? weight * Math.SQRT2 : weight;
}
```

## Бинарни хип са ажурирањем приоритета

Приоритетни ред подржава и промену приоритета већ уписаног чвора, што је потребно зато што информисана претрага може да пронађе јефтинији пут до чвора који се већ налази у фронтијеру. Положај сваког чвора памти се у помоћној мапи, чиме претрага чвора постаје операција сталне сложености.

```typescript
export class MinHeap {
  private heap: HeapNode[] = [];
  private positionMap: Map<string, number> = new Map();

  push(pos: Position, priority: number): void {
    this.heap.push({ pos, priority });
    const idx = this.heap.length - 1;
    this.positionMap.set(posKey(pos), idx);
    this.bubbleUp(idx);
  }

  updatePriority(pos: Position, newPriority: number): void {
    const idx = this.positionMap.get(posKey(pos));
    if (idx === undefined) return;
    const oldPriority = this.heap[idx].priority;
    this.heap[idx].priority = newPriority;
    if (newPriority < oldPriority) this.bubbleUp(idx);
    else this.bubbleDown(idx);
  }
}
```

## Мерење цене пута на заједничкој скали

Наредни исечак припада подсистему за мерење и реализује поступак описан у одељку 7.1. Цена се рачуна на путу који је алгоритам вратио, а не преузима се из његове интерне евиденције, чиме поређење различитих поступака постаје могуће.

```typescript
function measurePathCost(grid: Grid, path: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const [pr, pc] = path[i - 1];
    const [r, c] = path[i];
    const isDiag = pr !== r && pc !== c;
    total += grid.cells[r][c].weight * (isDiag ? Math.SQRT2 : 1);
  }
  return total;
}
```
