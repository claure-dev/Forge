import Store from 'electron-store';

interface StoreSchema {
  vaultPath?: string;
  recentVaults?: string[];
  windowBounds?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}

class ForgeStore {
  private store: Store<StoreSchema>;

  constructor() {
    this.store = new Store<StoreSchema>({
      defaults: {
        vaultPath: undefined,
        recentVaults: [],
        windowBounds: {
          width: 1400,
          height: 900,
        }
      }
    });
  }

  // Vault management
  getVaultPath(): string | undefined {
    return this.store.get('vaultPath');
  }

  setVaultPath(path: string): void {
    this.store.set('vaultPath', path);
    this.addToRecentVaults(path);
  }

  getRecentVaults(): string[] {
    return this.store.get('recentVaults', []);
  }

  addToRecentVaults(path: string): void {
    const recent = this.getRecentVaults();
    const updatedRecent = [path, ...recent.filter(p => p !== path)].slice(0, 10);
    this.store.set('recentVaults', updatedRecent);
  }

  // Window management
  getWindowBounds() {
    return this.store.get('windowBounds');
  }

  setWindowBounds(bounds: { x?: number; y?: number; width?: number; height?: number }): void {
    this.store.set('windowBounds', bounds);
  }

  // Clear all data
  clear(): void {
    this.store.clear();
  }
}

// Singleton instance
export const forgeStore = new ForgeStore();