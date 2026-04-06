import { Position } from '@shared/types';
import { posKey } from './helpers';

interface HeapNode {
  pos: Position;
  priority: number;
}

export class MinHeap {
  private heap: HeapNode[] = [];
  private positionMap: Map<string, number> = new Map();

  get size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  push(pos: Position, priority: number): void {
    const key = posKey(pos);
    const node: HeapNode = { pos, priority };
    this.heap.push(node);
    const idx = this.heap.length - 1;
    this.positionMap.set(key, idx);
    this.bubbleUp(idx);
  }

  pop(): Position | undefined {
    if (this.isEmpty()) return undefined;

    const top = this.heap[0];
    const key = posKey(top.pos);
    this.positionMap.delete(key);

    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.positionMap.set(posKey(last.pos), 0);
      this.bubbleDown(0);
    }

    return top.pos;
  }

  has(pos: Position): boolean {
    return this.positionMap.has(posKey(pos));
  }

  updatePriority(pos: Position, newPriority: number): void {
    const key = posKey(pos);
    const idx = this.positionMap.get(key);
    if (idx === undefined) return;

    const oldPriority = this.heap[idx].priority;
    this.heap[idx].priority = newPriority;

    if (newPriority < oldPriority) {
      this.bubbleUp(idx);
    } else {
      this.bubbleDown(idx);
    }
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this.heap[idx].priority >= this.heap[parentIdx].priority) break;
      this.swap(idx, parentIdx);
      idx = parentIdx;
    }
  }

  private bubbleDown(idx: number): void {
    const length = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest === idx) break;
      this.swap(idx, smallest);
      idx = smallest;
    }
  }

  private swap(i: number, j: number): void {
    const keyI = posKey(this.heap[i].pos);
    const keyJ = posKey(this.heap[j].pos);
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    this.positionMap.set(keyI, j);
    this.positionMap.set(keyJ, i);
  }
}
