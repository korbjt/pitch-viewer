import { initializeMicrophone, enableDebugMode, disableDebugMode, showDebugPanel, hideDebugPanel, debugMode, debugPanelVisible, debugFrequency, history, setDebugFrequency } from './pitchDetection.ts';
import { draw } from './staffRenderer.ts';
import { openSettingsModal, closeSettingsModal, enumerateMicrophones } from './settingsModal.ts';
import { loadTheme, loadKey, applyTheme, applyKey, currentKey } from './themeManager.ts';

function updatePitch(): void {
    if (debugMode) {
        // Use debug frequency
        history.push([debugFrequency, 0.96]); // Simulated pitch with high confidence (> 0.95)
    } else {
        // Use microphone input
        const detector = (window as any).pitchDetector;
        const analyzer = (window as any).analyzer;
        const ctx = (window as any).audioCtx;
        if (detector && analyzer && ctx) {
            const buffer = new Float32Array(detector.inputLength);
            analyzer.getFloatTimeDomainData(buffer);
            const pitch = detector.findPitch(buffer, ctx.sampleRate);
            if (pitch) history.push(pitch);
        }
    }

    if (history.length > 100) {
        history.shift();
    }
    window.requestAnimationFrame(() => draw(currentKey));
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme and key
    loadTheme();
    loadKey();

    // Initialize debug mode and panel visibility
    const savedDebugMode = localStorage.getItem('debugMode') === 'true';
    const savedPanelVisible = localStorage.getItem('debugPanelVisible') === 'true';

    if (savedDebugMode) {
        enableDebugMode();
        const debugToggle = document.getElementById('debug-toggle') as HTMLInputElement;
        if (debugToggle) debugToggle.checked = true;
    }

    if (savedPanelVisible) {
        showDebugPanel();
    } else {
        hideDebugPanel();
    }

    // Set initial key selector value
    const keySelect = document.getElementById('key-select') as HTMLSelectElement;
    if (keySelect) {
        keySelect.value = currentKey;
    }

    // Initialize debug controls
    const frequencyInput = document.getElementById('debug-frequency') as HTMLInputElement;
    const frequencyDisplay = document.getElementById('frequency-display');
    if (frequencyInput) {
        frequencyInput.value = debugFrequency.toString();
    }
    if (frequencyDisplay) {
        frequencyDisplay.textContent = debugFrequency.toFixed(1) + ' Hz';
    }

    // Modal event listeners
    const settingsButton = document.getElementById('settings-button');
    const debugButton = document.getElementById('debug-button');
    const closeButton = document.getElementById('close-settings');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const micButton = document.getElementById('mic-button-modal');
    const micSelect = document.getElementById('mic-select-modal') as HTMLSelectElement;
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;

    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            enumerateMicrophones();
            openSettingsModal();
        });
    }

    if (debugButton) {
        debugButton.addEventListener('click', () => {
            if (debugPanelVisible) {
                hideDebugPanel();
            } else {
                showDebugPanel();
            }
        });
    }

    if (closeButton) {
        closeButton.addEventListener('click', closeSettingsModal);
    }

    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', closeSettingsModal);
    }

    if (micButton) {
        micButton.addEventListener('click', async () => {
            const selectedDeviceId = micSelect ? micSelect.value : null;
            const success = await initializeMicrophone(selectedDeviceId);
            if (success) {
                closeSettingsModal();
            }
        });
    }

    if (themeSelect) {
        themeSelect.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            applyTheme(target.value);
        });
    }

    // Main interface key selector
    if (keySelect) {
        keySelect.addEventListener('change', (event) => {
            const target = event.target as HTMLSelectElement;
            applyKey(target.value);
        });
    }

    // Debug controls
    const debugToggle = document.getElementById('debug-toggle') as HTMLInputElement;
    const debugFrequencyInput = document.getElementById('debug-frequency') as HTMLInputElement;

    if (debugToggle) {
        debugToggle.addEventListener('change', (event) => {
            if (event.target instanceof HTMLInputElement) {
                if (event.target.checked) {
                    enableDebugMode();
                } else {
                    disableDebugMode();
                }
            }
        });
    }

    if (debugFrequencyInput) {
        debugFrequencyInput.addEventListener('input', (event) => {
            if (event.target instanceof HTMLInputElement) {
                const freq = parseFloat(event.target.value);
                if (!isNaN(freq) && freq >= 20 && freq <= 1000) {
                    setDebugFrequency(freq);
                    if (frequencyDisplay) {
                        frequencyDisplay.textContent = freq.toFixed(1) + ' Hz';
                    }
                }
            }
        });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const modal = document.getElementById('settings-modal');
            if (modal && modal.getAttribute('aria-hidden') === 'false') {
                closeSettingsModal();
            }
        }
    });

    // Initialize with default microphone
    await initializeMicrophone();
    setInterval(updatePitch, 25);
});