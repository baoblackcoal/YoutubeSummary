import { defaultTtsSettings, speedOptions as TtsSpeedOptions, pitchOptions as TtsPitchOptions } from '../common/settings';
import { ITtsSettings, ApiType, Language } from '../common/ISettings';
import { settingsManager } from '../common/settingsManager';
import { TTSSpeak, VoiceInfo } from '../common/ttsSpeak';
import { listenToMessages } from '../common/msTtsService';
import { MessageObserver } from '../utils/messageObserver';
import { ITtsMessage } from '../utils/messageQueue';
import './css/basePage.css';
import './css/ttsPage.css';
// import { II18n } from './options';
import { i18n, I18nService } from '../common/i18n';


export class TTSPage {
  private container: HTMLElement;
  private settings: ITtsSettings;
  private tts: TTSSpeak;
  private messageObserver: MessageObserver;
  private azureTtsListend: boolean = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'page-container';
    this.tts = TTSSpeak.getInstance();
    this.messageObserver = MessageObserver.getInstance();
    this.settings = { ...defaultTtsSettings };
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadSettings();
    this.createTTSControls();
    await this.loadTtsVoices();
    this.attachEventListeners();

    i18n.attachI18nEvent({
      eventId: 'ttsPage',
      callback: async (language: Language) => {
        await this.updateI18nAndAttachEvent();
      }
    });
  }

  public async updateI18nAndAttachEvent(): Promise<void> {
    // Update all labels
    // Define mapping of label elements to their corresponding i18n keys
    const labelMappings = {
      'Type': 'option_tts_type_label',
      'Language': 'option_tts_language_label',
      'Voice': 'option_tts_voice_label',
      'Speed': 'option_tts_speed_label',
      'Pitch': 'option_tts_pitch_label',
      'Volume': 'option_tts_volume_label'
    };

    // Update all labels
    const labels = this.container.querySelectorAll('.label');
    labels.forEach(label => {
      const text = label.textContent;
      if (text && text in labelMappings) {
          const messageKey = labelMappings[text as keyof typeof labelMappings];
          const translation = i18n.getMessage(messageKey);
          if (translation) {
              label.textContent = translation;
          }
      }
    });

    // Update buttons
    const testButton = this.container.querySelector('#test') as HTMLButtonElement;
    const stopButton = this.container.querySelector('#stop') as HTMLButtonElement;
    
    if (testButton) {
      testButton.textContent = i18n.getMessage('option_tts_test_button');
    }
    if (stopButton) {
      stopButton.textContent = i18n.getMessage('option_tts_stop_button');
    }

    // Update default options
    const defaultOptions = this.container.querySelectorAll('option[value=""]');
    defaultOptions.forEach(option => {
      option.textContent = i18n.getMessage('option_tts_default_option');
    });
  }

  private async loadSettings(): Promise<void> {
    this.settings = await settingsManager.getTtsSettings();
  }

  private async loadTtsVoices(): Promise<void> {
    if (this.settings.apiType === ApiType.Azure && !this.azureTtsListend) {
      this.azureTtsListend = true;
      await this.messageObserver.updateObserverType();
      listenToMessages();
    }

    this.tts.getVoiceNames((voices: VoiceInfo[]) => {
      this.populateLanguageOptions(voices);
      this.populateVoiceOptions(voices);
      this.populateSpeedAndPitchOptions();
      this.populateTtsTypeOptions();
    });
  }

  private createTTSControls(): void {
    const controls = document.createElement('div');
    controls.className = 'section';

    // TTS Type Selection
    const ttsTypeSection = document.createElement('div');
    const hide = true;
    if (hide) {
      ttsTypeSection.innerHTML = `
      <label class="hidden">${i18n.getMessage('option_tts_type_label')}</label>
      <select id="ttsType" class="hidden">
      </select>
      `;
    } else {
      ttsTypeSection.className = 'sub-section';
      ttsTypeSection.innerHTML = `
      <label class="label">${i18n.getMessage('option_tts_type_label')}</label>
      <select id="ttsType" class="select">
      </select>
      `;      
    }

    // Language Selection
    const languageSection = document.createElement('div');
    languageSection.className = 'sub-section';
    languageSection.innerHTML = `
      <label class="label">${i18n.getMessage('option_tts_language_label')}</label>
      <select id="language" class="select">
      </select>
    `;

    // Voice Selection
    const voiceSection = document.createElement('div');
    voiceSection.className = 'sub-section';
    voiceSection.innerHTML = `
      <label class="label">${i18n.getMessage('option_tts_voice_label')}</label>
      <select id="voiceName" class="select">
      </select>
    `;

    // Speed and Pitch Controls
    const speedPitchSection = document.createElement('div');
    speedPitchSection.className = 'speed-pitch-grid';
    speedPitchSection.innerHTML = `
      <div class="sub-section">
        <label class="label">${i18n.getMessage('option_tts_speed_label')}</label>
        <select id="speed" class="select"></select>
      </div>
      <div class="sub-section">
        <label class="label">${i18n.getMessage('option_tts_pitch_label')}</label>
        <select id="pitch" class="select"></select>
      </div>
    `;

    // Volume Control
    const volumeSection = document.createElement('div');
    volumeSection.className = 'sub-section';
    volumeSection.innerHTML = `
      <label class="label">${i18n.getMessage('option_tts_volume_label')}</label>
      <input type="range" id="volume" min="0" max="1" step="0.1" value="${this.settings.volume}"
             class="volume-slider">
    `;

    // Test Controls
    const testSection = document.createElement('div');
    testSection.className = 'test-controls';
    testSection.innerHTML = `
      <button id="test" class="base-button">${i18n.getMessage('option_tts_test_button')}</button>
      <button id="stop" class="base-button">${i18n.getMessage('option_tts_stop_button')}</button>
    `;

    controls.appendChild(ttsTypeSection);
    controls.appendChild(languageSection);
    controls.appendChild(voiceSection);
    controls.appendChild(speedPitchSection);
    controls.appendChild(volumeSection);
    controls.appendChild(testSection);

    this.container.appendChild(controls);
  }

  private populateTtsTypeOptions(): void {
    const ttsTypeSelect = this.container.querySelector('#ttsType') as HTMLSelectElement;
    ttsTypeSelect.innerHTML = '';
    
    Object.values(ApiType).forEach((apiType) => {
      const option = document.createElement('option');
      option.textContent = apiType;
      option.value = apiType;
      ttsTypeSelect.appendChild(option);
    });
    
    ttsTypeSelect.value = this.settings.apiType;
  }

  private populateLanguageOptions(voices: VoiceInfo[]): void {
    const languageSelect = this.container.querySelector('#language') as HTMLSelectElement;
    const languages = new Set<string>();
    
    voices.forEach((voice) => {
      if (voice.lang) {
        const languageCode = voice.lang.split('-')[0];
        languages.add(languageCode);
      }
    });

    languageSelect.innerHTML = `<option value="">${i18n.getMessage('option_tts_default_option')}</option>`;
    languages.forEach((language) => {
      const option = document.createElement('option');
      option.value = language;
      option.textContent = language;
      languageSelect.appendChild(option);
    });

    languageSelect.value = this.settings.language;
  }

  private populateVoiceOptions(voices: VoiceInfo[]): void {
    const voiceSelect = this.container.querySelector('#voiceName') as HTMLSelectElement;
    const selectedLanguage = (this.container.querySelector('#language') as HTMLSelectElement).value;
    
    voiceSelect.innerHTML = selectedLanguage === '' ? '<option value="">Default</option>' : '';

    voices.forEach((voice) => {
      if (voice.lang && voice.lang.startsWith(selectedLanguage) && voice.voiceName) {
        const option = document.createElement('option');
        option.value = voice.voiceName;
        option.textContent = `${voice.voiceName} (${voice.lang})`;
        voiceSelect.appendChild(option);
      }
    });

    voiceSelect.value = this.settings.voiceName;
  }

  private populateSpeedAndPitchOptions(): void {
    const speedSelect = this.container.querySelector('#speed') as HTMLSelectElement;
    const pitchSelect = this.container.querySelector('#pitch') as HTMLSelectElement;

    speedSelect.innerHTML = '';
    pitchSelect.innerHTML = '';

    TtsSpeedOptions.forEach((value) => {
      const option = document.createElement('option');
      option.value = value.toString();
      option.textContent = `${value}X`;
      speedSelect.appendChild(option);
    });

    TtsPitchOptions.forEach((value) => {
      const option = document.createElement('option');
      option.value = value.toString();
      option.textContent = `${value}X`;
      pitchSelect.appendChild(option);
    });

    speedSelect.value = this.settings.rate.toString();
    pitchSelect.value = this.settings.pitch.toString();
  }

  private attachEventListeners(): void {
    const ttsTypeSelect = this.container.querySelector('#ttsType') as HTMLSelectElement;
    const languageSelect = this.container.querySelector('#language') as HTMLSelectElement;
    const voiceSelect = this.container.querySelector('#voiceName') as HTMLSelectElement;
    const speedSelect = this.container.querySelector('#speed') as HTMLSelectElement;
    const pitchSelect = this.container.querySelector('#pitch') as HTMLSelectElement;
    const volumeInput = this.container.querySelector('#volume') as HTMLInputElement;
    const testButton = this.container.querySelector('#test') as HTMLButtonElement;
    const stopButton = this.container.querySelector('#stop') as HTMLButtonElement;

    ttsTypeSelect.addEventListener('change', async () => {
      this.settings.apiType = ttsTypeSelect.value as ApiType;
      this.settings.language = '';
      this.settings.voiceName = '';
      languageSelect.value = '';
      voiceSelect.value = '';
      await this.saveSettings();
      await this.loadTtsVoices();

      const message: ITtsMessage = { action: 'reloadPage' };
      chrome.runtime.sendMessage(message);
      
      await this.tts.speak(' '); // update messageObserver
    });

    languageSelect.addEventListener('change', async () => {
      this.settings.language = languageSelect.value;
      if (voiceSelect.value === '') {
        voiceSelect.value = '';
      }
      await this.saveSettings();
      this.tts.getVoiceNames((voices) => this.populateVoiceOptions(voices));
    });

    [voiceSelect, speedSelect, pitchSelect, volumeInput].forEach((element) => {
      element.addEventListener('change', async () => {
        await this.saveSettings();
      });
    });

    testButton.addEventListener('click', async () => {
      try {
        const response = await fetch('languageStrings.json');
        const languageStrings = await response.json();
        const testText = languageStrings[this.settings.language] || 
          "Good day, world! May your moments be filled with peace.";
        
        await this.tts.resetStreamSpeak();
        await this.tts.speak(testText);
      } catch (error) {
        console.error('Error loading language strings:', error);
      }
    });

    stopButton.addEventListener('click', () => {
      this.tts.stop();
    });    
  }

  private async saveSettings(): Promise<void> {
    const ttsTypeSelect = this.container.querySelector('#ttsType') as HTMLSelectElement;
    const languageSelect = this.container.querySelector('#language') as HTMLSelectElement;
    const voiceSelect = this.container.querySelector('#voiceName') as HTMLSelectElement;
    const speedSelect = this.container.querySelector('#speed') as HTMLSelectElement;
    const pitchSelect = this.container.querySelector('#pitch') as HTMLSelectElement;
    const volumeInput = this.container.querySelector('#volume') as HTMLInputElement;

    const settings: ITtsSettings = {
      apiType: ttsTypeSelect.value as ApiType,
      language: languageSelect.value,
      voiceName: voiceSelect.value,
      rate: parseFloat(speedSelect.value),
      pitch: parseFloat(pitchSelect.value),
      volume: parseFloat(volumeInput.value),
    };

    this.settings = settings;
    await settingsManager.setTtsSettings(settings);
  }

  public getElement(): HTMLElement {
    return this.container;
  }
}
