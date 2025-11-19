export let currentKey = 'C'; // Default key

export function applyTheme(theme: string): void {
    const root = document.documentElement;
    if (theme === 'auto') {
        root.removeAttribute('data-theme');
    } else {
        root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
}

export function loadTheme(): string {
    const savedTheme = localStorage.getItem('theme') || 'auto';
    applyTheme(savedTheme);
    return savedTheme;
}

export function applyKey(key: string): void {
    currentKey = key;
    localStorage.setItem('key', key);
}

export function loadKey(): string {
    const savedKey = localStorage.getItem('key') || 'C';
    applyKey(savedKey);
    return savedKey;
}