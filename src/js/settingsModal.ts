export function openSettingsModal(): void {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Update theme selector to show current theme
        const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
        if (themeSelect) {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'auto';
            themeSelect.value = currentTheme === 'auto' ? 'auto' : currentTheme;
        }
    }
}

export function closeSettingsModal(): void {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

// Microphone device enumeration
export async function enumerateMicrophones(): Promise<void> {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const microphones = devices.filter(device => device.kind === 'audioinput');

        const micSelect = document.getElementById('mic-select-modal') as HTMLSelectElement;
        if (micSelect) {
            // Clear existing options except the default
            micSelect.innerHTML = '<option value="">Default</option>';

            // Add microphone options
            microphones.forEach(mic => {
                const option = document.createElement('option');
                option.value = mic.deviceId;
                option.textContent = mic.label || `Microphone ${micSelect.options.length}`;
                micSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.warn('Could not enumerate microphones:', error);
    }
}