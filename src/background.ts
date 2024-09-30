/// <reference types="chrome"/>
import { Env, getEnvironment } from './common';
import { settingsManager } from "./settingsManager";
import {  ISettingsManager } from './settingsManager'; // Import interfaces

// Define interfaces for key components
interface ITtsService {
    speakText(text: string, sender: chrome.runtime.MessageSender, playVideo?: () => void): Promise<void>;
    handleStreamText(text: string, sender: chrome.runtime.MessageSender, playVideo: () => void): Promise<void>;
}

// TTS Service Implementation
class TtsService implements ITtsService {
    private speakTextArray: string[] = [];
    private lastStreamText: string = '';
    private isProcessing: boolean = false;
    private stopStreamSpeakFlag: boolean = false;
    private settingsManager: ISettingsManager;
    private defaultSender: chrome.runtime.MessageSender = {};

    constructor(settingsManager: ISettingsManager) {
        this.settingsManager = settingsManager;
    }

    async speakText(text: string, sender: chrome.runtime.MessageSender = this.defaultSender, playVideo: () => void = () => {}): Promise<void> {
        await this.handleStreamText(text, sender, playVideo);
    }

    async handleStreamText(text: string, sender: chrome.runtime.MessageSender=this.defaultSender, playVideo: () => void = () => {}): Promise<void> {
        if (this.stopStreamSpeakFlag) {
            return;
        }

        if (text.length == 0) {
            return;
        }

        this.speakTextArray.push(text);
        this.speakNextText(sender, playVideo);
    }

    private async speakNextText(sender: chrome.runtime.MessageSender, playVideo: () => void): Promise<void> {
        if (this.isProcessing) {
            return;
        }
        this.isProcessing = true;

        while (this.speakTextArray.length > 0) {
            while (await new Promise(resolve => chrome.tts.isSpeaking(resolve))) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            const settings = await this.settingsManager.getTtsSettings();
            const text = this.speakTextArray.shift();
            console.log("speakNextText: ", text);
            if (text != null) {
                //sent current text to content-script
                if (sender.tab && sender.tab.id !== undefined) {    
                    chrome.tabs.sendMessage(sender.tab.id, { action: 'ttsSpeakingText', text: text });
                }

                chrome.tts.speak(text, {
                    rate: settings.rate,
                    pitch: settings.pitch,
                    volume: settings.volume,
                    voiceName: settings.voiceName,
                    onEvent: (event: chrome.tts.TtsEvent) => {
                        if (event.type === 'end') {
                            if (this.speakTextArray.length > 0) {
                                this.speakNextText(sender, playVideo);
                            } else {
                                this.lastStreamText = '';
                                playVideo();
                            }
                        }
                    }
                });
            }
        }
        this.isProcessing = false;
    }

    stopStreamSpeak() {
        this.stopStreamSpeakFlag = true;
        this.speakTextArray = [];
        this.lastStreamText = '';
        chrome.tts.stop();
    }

    resetStreamSpeak() {
        this.stopStreamSpeakFlag = false;
        this.speakTextArray = [];
        this.lastStreamText = '';
        chrome.tts.stop();
    }
}

// Initialize TTS Service
const ttsService = new TtsService(settingsManager);

// Extension first installed
chrome.runtime.onInstalled.addListener(async () => {
    console.log("Extension installed");
    await settingsManager.initializeSettingsWhenInstalled();
    if (getEnvironment() == Env.Prod) {
        console.log("Opening options page in background");
        chrome.runtime.openOptionsPage();
    }
    chrome.contextMenus.create({
        id: "readAloud",
        title: "Read with TTS",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    if (!tab) return;
    if (info.menuItemId === "readAloud") {
        const text = info.selectionText;
        if (text) {
            ttsService.speakText(text);
        }
    }
});

function respondToSenderSuccess(sendResponse: (response?: any) => void) {
    sendResponse({ status: "success" });
}



chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    switch (message.action) {
        case 'resetWhenPageChange':
            ttsService.resetStreamSpeak();
            respondToSenderSuccess(sendResponse);
            break;
        case 'resetStreamSpeak':
            ttsService.resetStreamSpeak();
            respondToSenderSuccess(sendResponse);
            break;
        case 'speak':
            ttsService.speakText(message.text,  sender);
            respondToSenderSuccess(sendResponse);
            break;
        case 'speakAndPlayVideo':
            ttsService.speakText(message.text,  sender, () => {
                if (sender.tab && sender.tab.id !== undefined) {
                    chrome.tabs.sendMessage(sender.tab.id, { action: 'playVideo' });
                }
            });
            respondToSenderSuccess(sendResponse);
            break;
        case 'ttsStop':
            ttsService.stopStreamSpeak();
            respondToSenderSuccess(sendResponse);
            break;
        case 'ttsCheckSpeaking':
            chrome.tts.isSpeaking((isSpeaking) => {
                sendResponse({ isSpeaking });
            });
            return true;
        case 'openOptionsPage':
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                window.open(chrome.runtime.getURL('options.html'));
            }
            respondToSenderSuccess(sendResponse);
            break;
        default:
            console.log(`(Background)Unknown message action: ${message.action}`);
    }
});
