import { Language, defaultSummarySettings, SummarySettings } from '../common/settings';
import { defaultPromptText } from '../prompts/defaultPromptText';
import { settingsManager } from '../common/settingsManager';
import './css/basePage.css';
import './css/summaryPage.css';

export class SummaryPage {
  private container: HTMLElement;
  private settings: SummarySettings;
  private llmSettings: any;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'summary-container';
    this.settings = { ...defaultSummarySettings };
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadSettings();
    this.createSummaryControls();
    this.attachEventListeners();
  }

  private async loadSettings(): Promise<void> {
    this.settings = await settingsManager.getSummarySettings();
    this.llmSettings = await settingsManager.getLlmSettings();
  }

  private createSummaryControls(): void {
    const controls = document.createElement('div');
    controls.className = 'controls-container';

    // Update API Key Section
    const apiKeySection = document.createElement('div');
    apiKeySection.id = 'apiKeySection';
    apiKeySection.className = 'section';
    apiKeySection.innerHTML = `
      <label class="label">Gemini API Key</label>
      <div class="radio-wrapper">
        <input type="radio" name="apiKeyType" id="apiKeyTypeCommonKey" value="Common Key" 
               ${!this.llmSettings.apiKey || this.llmSettings.apiKey === 'AIzaSyDkPJhsoRJcLvbYurWIWtf_n50izLzSGN4' ? 'checked' : ''}>
        <label for="apiKeyTypeCommonKey" class="radio-label">Common Key</label>

        <input type="radio" name="apiKeyType" id="apiKeyTypeYourKey" value="Your Key"
               ${this.llmSettings.apiKey && this.llmSettings.apiKey !== 'AIzaSyDkPJhsoRJcLvbYurWIWtf_n50izLzSGN4' ? 'checked' : ''}>
        <label for="apiKeyTypeYourKey" class="radio-label">Your Key</label>
      </div>
      <input type="text" id="geminiApiKey" class="input-field">
      <button id="testApiKey" class="base-button">Test</button>
      
      <div id="apiKeyInfoCommonKey" class="api-key-info api-key-info-common">
        <p class="mb-2"><strong>Common Key Information:</strong></p>
        <p>Use the Common Key, which is a shared key with the following limits:</p>
        <ul class="list-disc ml-4 mt-2">
          <li>15 requests per minute (RPM)</li>
          <li>1 million tokens per minute (TPM)</li>
          <li>1,500 requests per day (RPD)</li>
        </ul>
        <p class="mt-2">For more details, refer to the 
          <a href="https://ai.google.dev/pricing#1_5flash" target="_blank" rel="noopener noreferrer">
            Gemini Flash 1.5 Pricing
          </a>
        </p>
      </div>

      <div id="apiKeyInfoYourKey" class="api-key-info api-key-info-custom">
        <p class="mb-2"><strong>Custom API Key Setup:</strong></p>
        <p>Get your personal API key from the 
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">
            Google Cloud Console
          </a>
        </p>
        <p class="mt-2">Using your own API key provides:</p>
        <ul class="list-disc ml-4 mt-2">
          <li>Higher rate limits</li>
          <li>Independent quota management</li>
          <li>Better control over API usage</li>
        </ul>
      </div>
    `;

    // Language Selection
    const languageSection = document.createElement('div');
    languageSection.className = 'section';
    languageSection.innerHTML = `
      <label class="label">Summary Language</label>
      <select id="language" class="select-field">
        ${Object.entries(Language).map(([key, value]) => `
          <option value="${value}" ${this.settings.language === value ? 'selected' : ''}>
            ${key}
          </option>
        `).join('')}
      </select>
    `;

    // Auto Settings
    const autoSettingsSection = document.createElement('div');
    autoSettingsSection.className = 'section';
    autoSettingsSection.innerHTML = `
      <div class="checkbox-wrapper">
        <input type="checkbox" id="autoSummary" class="checkbox-input" 
               ${this.settings.autoSummary ? 'checked' : ''}>
        <label for="autoSummary" class="checkbox-label">Auto-generate summary when video loads</label>
      </div>
      <div class="checkbox-wrapper">
        <input type="checkbox" id="autoTtsSpeak" class="checkbox-input"
               ${this.settings.autoTtsSpeak ? 'checked' : ''}>
        <label for="autoTtsSpeak" class="checkbox-label">Stop video and speak summary automatically</label>
      </div>
    `;

    // Prompt Settings
    const promptSection = document.createElement('div');
    promptSection.id = 'promptSection';
    promptSection.className = 'section';
    promptSection.innerHTML = `
      <div id="promptTypeSection" class="section">
        <label class="label">Prompt Type</label>
        <select id="promptType" class="select-field">
          <option value="0">Default</option>
          <option value="1">Custom Prompt 1</option>
          <option value="2">Custom Prompt 2</option>
          <option value="3">Custom Prompt 3</option>
        </select>
      </div>

      <div id="promptContentSection">
        <div id="defaultPrompt" class="section prompt-content">
          <label class="label">Default Prompt (Read-only)</label>
          <div class="truncate-wrapper">
            <textarea id="defaultPromptText" rows="15" readonly
                      class="textarea-field readonly">${defaultPromptText}</textarea>
          </div>
        </div>

        ${[1, 2, 3].map(i => `
          <div id="diyPrompt${i}" class="section prompt-content" style="display: none;">
            <label class="label">Custom Prompt ${i}</label>
            <div class="truncate-wrapper">
              <textarea id="diyPromptText${i}" rows="15" readonly
                        class="textarea-field">${this.settings[`diyPromptText${i}` as keyof SummarySettings] || ''}</textarea>
            </div>
            <button id="editPrompt${i}" class="base-button edit-prompt-btn">Edit</button>
          </div>
        `).join('')}
      </div>
    `;

    controls.appendChild(apiKeySection);
    controls.appendChild(languageSection);
    controls.appendChild(autoSettingsSection);
    controls.appendChild(promptSection);

    this.container.appendChild(controls);

    // Create prompt edit dialog
    const dialogHTML = `
      <dialog id="promptEditDialog" class="prompt-edit-dialog">
        <div class="dialog-content">
          <h2 id="dialogPromptTitle" class="dialog-title">Edit Custom Prompt</h2>
          <div class="prompt-info">
            <p class="prompt-info-title">Available variables for custom prompts:</p>
            <ul class="prompt-info-list">
              <li><code class="code-text">{videoTitle}</code>: The title of the YouTube video</li>
              <li><code class="code-text">{textTranscript}</code>: The full transcript of the video</li>
              <li><code class="code-text">{language}</code>: The language of the video</li>
            </ul>
          </div>
          <textarea id="dialogPromptText" rows="20" class="dialog-textarea"></textarea>
          <div class="dialog-buttons">
            <button id="dialogSave" class="base-button">Save</button>
            <button id="dialogCancel" class="base-button secondary">Cancel</button>
          </div>
        </div>
      </dialog>
    `;

    this.container.insertAdjacentHTML('beforeend', dialogHTML);

    // Initialize prompt type selection
    this.updatePromptVisibility(this.settings.promptType);
    
    // Add event listeners for prompt editing
    this.attachPromptEventListeners();

    // Add new method call for API key radio handling
    this.initializeApiKeySection();
  }

  private initializeApiKeySection(): void {
    const commonKeyRadio = this.container.querySelector('#apiKeyTypeCommonKey') as HTMLInputElement;
    const yourKeyRadio = this.container.querySelector('#apiKeyTypeYourKey') as HTMLInputElement;
    const apiKeyInput = this.container.querySelector('#geminiApiKey') as HTMLInputElement;
    const commonKeyInfo = this.container.querySelector('#apiKeyInfoCommonKey') as HTMLElement;
    const yourKeyInfo = this.container.querySelector('#apiKeyInfoYourKey') as HTMLElement;

    const updateApiKeySection = (isCommonKey: boolean) => {
        if (isCommonKey) {
            apiKeyInput.value = 'AIzaSyDkPJhsoRJcLvbYurWIWtf_n50izLzSGN4';
            commonKeyInfo.style.display = 'block';
            yourKeyInfo.style.display = 'none';
        } else {
            apiKeyInput.value = this.llmSettings.apiKey || '';
            commonKeyInfo.style.display = 'none';
            yourKeyInfo.style.display = 'block';
        }
    };

    // Initialize based on current selection
    updateApiKeySection(commonKeyRadio.checked);

    // Add event listeners for radio buttons
    commonKeyRadio.addEventListener('change', () => {
        if (commonKeyRadio.checked) {
            updateApiKeySection(true);
            this.saveSettings();
        }
    });

    yourKeyRadio.addEventListener('change', () => {
        if (yourKeyRadio.checked) {
            updateApiKeySection(false);
            this.saveSettings();
        }
    });
  }

  private attachEventListeners(): void {
    // Handle settings changes
    const inputs = {
      geminiApiKey: this.container.querySelector('#geminiApiKey') as HTMLInputElement,
      promptType: this.container.querySelector('#promptType') as HTMLSelectElement,
      language: this.container.querySelector('#language') as HTMLSelectElement,
      autoTtsSpeak: this.container.querySelector('#autoTtsSpeak') as HTMLInputElement,
      autoSummary: this.container.querySelector('#autoSummary') as HTMLInputElement,
      diyPromptText1: this.container.querySelector('#diyPromptText1') as HTMLTextAreaElement,
      diyPromptText2: this.container.querySelector('#diyPromptText2') as HTMLTextAreaElement,
      diyPromptText3: this.container.querySelector('#diyPromptText3') as HTMLTextAreaElement,
      apiKeyType: this.container.querySelector('input[name="apiKeyType"]:checked') as HTMLInputElement,
    };

    // Auto-save on change
    Object.values(inputs).forEach(input => {
      input.addEventListener('change', async () => {
        await this.saveSettings();
      });
    });
  }

  private async saveSettings(): Promise<void> {
    const inputs = {
      apiKeyType: this.container.querySelector('input[name="apiKeyType"]:checked') as HTMLInputElement,
      geminiApiKey: this.container.querySelector('#geminiApiKey') as HTMLInputElement,
      promptType: this.container.querySelector('#promptType') as HTMLSelectElement,
      language: this.container.querySelector('#language') as HTMLSelectElement,
      autoTtsSpeak: this.container.querySelector('#autoTtsSpeak') as HTMLInputElement,
      autoSummary: this.container.querySelector('#autoSummary') as HTMLInputElement,
      diyPromptText1: this.container.querySelector('#diyPromptText1') as HTMLTextAreaElement,
      diyPromptText2: this.container.querySelector('#diyPromptText2') as HTMLTextAreaElement,
      diyPromptText3: this.container.querySelector('#diyPromptText3') as HTMLTextAreaElement,
    };

    const summarySettings: SummarySettings = {
      promptType: parseInt(inputs.promptType.value),
      diyPromptText1: inputs.diyPromptText1.value,
      diyPromptText2: inputs.diyPromptText2.value,
      diyPromptText3: inputs.diyPromptText3.value,
      language: inputs.language.value,
      autoTtsSpeak: inputs.autoTtsSpeak.checked,
      autoSummary: inputs.autoSummary.checked,
    };

    await settingsManager.setLlmSettings({ 
      ...this.llmSettings, 
      apiKey: inputs.geminiApiKey.value 
    });
    await settingsManager.setSummarySettings(summarySettings);

    this.settings = summarySettings;
  }

  private attachPromptEventListeners(): void {
    const promptTypeSelect = this.container.querySelector('#promptType') as HTMLSelectElement;
    const dialog = this.container.querySelector('#promptEditDialog') as HTMLDialogElement;
    const dialogTextarea = dialog.querySelector('#dialogPromptText') as HTMLTextAreaElement;
    
    // Handle prompt type changes
    promptTypeSelect.value = this.settings.promptType.toString();
    promptTypeSelect.addEventListener('change', (e) => {
        const newType = parseInt((e.target as HTMLSelectElement).value);
        this.updatePromptVisibility(newType);
    });

    // Handle edit buttons
    [1, 2, 3].forEach(i => {
        const editBtn = this.container.querySelector(`#editPrompt${i}`) as HTMLButtonElement;
        editBtn?.addEventListener('click', () => {
            const promptTextarea = this.container.querySelector(`#diyPromptText${i}`) as HTMLTextAreaElement;
            dialogTextarea.value = promptTextarea.value;
            dialog.setAttribute('data-prompt-id', i.toString());
            dialog.showModal();
        });
    });

    // Handle dialog buttons
    const saveBtn = dialog.querySelector('#dialogSave');
    const cancelBtn = dialog.querySelector('#dialogCancel');

    saveBtn?.addEventListener('click', () => {
        const promptId = parseInt(dialog.getAttribute('data-prompt-id') || '0');
        const promptTextarea = this.container.querySelector(`#diyPromptText${promptId}`) as HTMLTextAreaElement;
        promptTextarea.value = dialogTextarea.value;
        this.saveSettings();
        dialog.close();
    });

    cancelBtn?.addEventListener('click', () => {
        dialog.close();
    });
  }

  private updatePromptVisibility(promptType: number): void {
    const allPrompts = this.container.querySelectorAll('.prompt-content');
    allPrompts.forEach(prompt => (prompt as HTMLElement).style.display = 'none');

    if (promptType === 0) {
        const defaultPrompt = this.container.querySelector('#defaultPrompt') as HTMLElement;
        defaultPrompt.style.display = 'block';
    } else {
        const customPrompt = this.container.querySelector(`#diyPrompt${promptType}`) as HTMLElement;
        customPrompt.style.display = 'block';
    }
  }

  public getElement(): HTMLElement {
    return this.container;
  }
}
