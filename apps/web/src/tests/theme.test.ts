import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  useUIStore,
  getStoredTheme,
  applyThemeToDom,
  THEME_STORAGE_KEY,
} from '../stores/ui-store';

class MockStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

class MockClassList {
  private classes = new Set<string>();
  add(name: string) {
    this.classes.add(name);
  }
  remove(name: string) {
    this.classes.delete(name);
  }
  contains(name: string): boolean {
    return this.classes.has(name);
  }
}

class MockElement {
  classList = new MockClassList();
  attributes: Record<string, string> = {};
  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }
}

describe('Theme Switcher & Persistence', () => {
  const originalWindow = global.window;
  const originalDocument = global.document;
  const originalLocalStorage = global.localStorage;

  let mockStorage: MockStorage;
  let mockDocElement: MockElement;

  beforeEach(() => {
    mockStorage = new MockStorage();
    mockDocElement = new MockElement();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = mockStorage;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).window = {
      localStorage: mockStorage,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).document = {
      documentElement: mockDocElement,
    };

    useUIStore.setState({ theme: 'dark' });
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).window = originalWindow;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).document = originalDocument;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = originalLocalStorage;
  });

  it('defaults to dark mode when no preference is saved', () => {
    const theme = getStoredTheme();
    expect(theme).toBe('dark');
  });

  it('reads light mode from localStorage correctly', () => {
    mockStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(getStoredTheme()).toBe('light');
  });

  it('applies dark theme to document and persists preference', () => {
    applyThemeToDom('dark');
    expect(mockDocElement.classList.contains('dark')).toBe(true);
    expect(mockDocElement.classList.contains('light')).toBe(false);
    expect(mockDocElement.getAttribute('data-theme')).toBe('dark');
    expect(mockStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('applies light theme to document and persists preference', () => {
    applyThemeToDom('light');
    expect(mockDocElement.classList.contains('light')).toBe(true);
    expect(mockDocElement.classList.contains('dark')).toBe(false);
    expect(mockDocElement.getAttribute('data-theme')).toBe('light');
    expect(mockStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('toggles theme back and forth via useUIStore', () => {
    useUIStore.getState().setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');
    expect(mockDocElement.classList.contains('dark')).toBe(true);

    // Toggle to light (white mode)
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('light');
    expect(mockDocElement.classList.contains('light')).toBe(true);
    expect(mockDocElement.classList.contains('dark')).toBe(false);
    expect(mockStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    // Toggle back to dark
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('dark');
    expect(mockDocElement.classList.contains('dark')).toBe(true);
    expect(mockDocElement.classList.contains('light')).toBe(false);
    expect(mockStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });
});
