/**
 * Performance monitoring system for the FPS game.
 * Tracks FPS, frame times, memory usage, and draw calls.
 */
export class PerformanceMonitor {
  private fps: number = 0;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private frameTimes: number[] = [];
  private readonly maxSamples = 60;
  
  // Stats
  public currentFps: number = 0;
  public avgFrameTime: number = 0;
  public minFps: number = Infinity;
  public maxFps: number = 0;
  public memoryUsage: number = 0;
  
  // UI element
  private element: HTMLElement | null = null;
  private visible: boolean = false;
  
  constructor() {
    this.lastTime = performance.now();
  }
  
  /**
   * Toggle the performance overlay (press F3 in-game)
   */
  public toggle(): void {
    this.visible = !this.visible;
    if (this.visible && !this.element) {
      this.createElement();
    }
    if (this.element) {
      this.element.style.display = this.visible ? 'block' : 'none';
    }
  }
  
  /**
   * Call once per frame to update metrics
   */
  public update(): void {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    
    this.frameCount++;
    this.frameTimes.push(delta);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }
    
    // Calculate FPS every 500ms
    if (this.frameCount % 30 === 0) {
      this.avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      this.currentFps = Math.round(1000 / this.avgFrameTime);
      this.minFps = Math.min(this.minFps, this.currentFps);
      this.maxFps = Math.max(this.maxFps, this.currentFps);
      
      // Memory usage (if available)
      const perf = performance as any;
      if (perf.memory) {
        this.memoryUsage = Math.round(perf.memory.usedJSHeapSize / 1048576);
      }
      
      this.updateUI();
    }
  }
  
  private createElement(): void {
    this.element = document.createElement('div');
    this.element.id = 'perf-monitor';
    this.element.style.cssText = `
      position: fixed; top: 8px; left: 8px; z-index: 10000;
      background: rgba(0,0,0,0.8); color: #0f0; font-family: monospace;
      font-size: 12px; padding: 8px 12px; border-radius: 6px;
      pointer-events: none; line-height: 1.6;
    `;
    document.body.appendChild(this.element);
  }
  
  private updateUI(): void {
    if (!this.element || !this.visible) return;
    const fpsColor = this.currentFps >= 55 ? '#0f0' : this.currentFps >= 30 ? '#ff0' : '#f00';
    this.element.innerHTML = `
      <span style="color:${fpsColor}">${this.currentFps} FPS</span> (${this.avgFrameTime.toFixed(1)}ms)<br>
      Min: ${this.minFps} / Max: ${this.maxFps}<br>
      ${this.memoryUsage ? `Memory: ${this.memoryUsage} MB` : ''}
    `;
  }
  
  /**
   * Get a snapshot of current performance metrics
   */
  public getSnapshot(): Record<string, number> {
    return {
      fps: this.currentFps,
      frameTime: this.avgFrameTime,
      minFps: this.minFps,
      maxFps: this.maxFps,
      memoryMB: this.memoryUsage,
    };
  }
  
  public dispose(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
