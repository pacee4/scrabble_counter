import { clamp } from "@/core/functions";


interface SoundOptions {
    offset?: number,
    pitch?: number,
    volumeNode?: string
}
class SoundManager {
    audio: {[index: string]: AudioBuffer} = {};
    audioCtx: AudioContext|null = (()=>{
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            return AudioContextClass ? new AudioContextClass() : null;
        }
        catch (e) {
            return null;
        }
    })();
    private sources: Map<string, AudioBufferSourceNode> = new Map();
    volumeNodes: Map<string, GainNode> = new Map();

    private playingFirstTime = true;

    constructor() {
        if (!this.audioCtx) {
            window.alert("Web Audio API не поддерживается или заблокирован. Для корректной работы используйте обновлённый браузер.");
        }
    }

    /**
     * Plays a sound without keeping its source for stopping.
     * The sound playback will resume on user activation, as the browser
     * does not allow it on page load.
     */
    produce(sound: string, soundOptions?: SoundOptions) {
        if (!this.audioCtx) return;
        this.waitPlaySoundF(sound, false, soundOptions);
    }

    /**
     * Plays a sound and keeps its source for stopping.
     * The sound playback will resume on user activation, as the browser
     * does not allow it on page load.
     */
    play(sound: string, soundOptions?: SoundOptions) {
        if (!this.audioCtx) return;
        this.stop(sound);
        this.waitPlaySoundF(sound, true, soundOptions);
    }

    stop(sound: string) {
        if (!this.audioCtx) return;
        const source = this.sources.get(sound);
        if (source) {
            source.onended = null;
            source.stop(0);
            this.sources.delete(sound);
        }
    }

    stopAll() {
        if (!this.audioCtx) return;
        for (const source of this.sources.values()) {
            source.onended = null;
            source.stop(0);
        }
        this.sources.clear();
    }

    /**
     * Sets volume to sounds with the specific volume node.
     */
    setVolume(volumeNode: string, volume: number) {
        if (!this.audioCtx) return;
        const gainNode = this.volumeNodes.get(volumeNode);
        if (gainNode) {
            gainNode.gain.value = clamp(volume, 0, 1);
        }
    }
    smoothVolume(volumeNode: string, volume: number, duration: number) {
        if (!this.audioCtx) return;
        const gainNode = this.volumeNodes.get(volumeNode);
        if (gainNode) {
            const now = this.audioCtx.currentTime;
            gainNode.gain.linearRampToValueAtTime(clamp(volume, 0, 1), now+duration);
        }
    }

    /**
     * Sets volume to all sounds.
     */
    setVolumeAll(volume: number) {
        if (!this.audioCtx) return;
        for (const gainNode of this.volumeNodes.values()) {
            gainNode.gain.value = clamp(volume, 0, 1);
        }
    }
    smoothVolumeAll(volume: number, duration: number) {
        if (!this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        for (const gainNode of this.volumeNodes.values()) {
            gainNode.gain.linearRampToValueAtTime(clamp(volume, 0, 1), now+duration);
        }
    }

    async pauseCtx() {
        if (this.audioCtx && this.audioCtx.state === "running") {
            await this.audioCtx.suspend();
        }
    }
    async resumeCtx() {
        if (this.audioCtx && this.audioCtx.state === "suspended") {
            await this.audioCtx.resume();
        }
    }


    private waitPlaySoundF(sound: string, save: boolean, soundOptions?: SoundOptions) {
        const soundBuffer = this.audio[sound];
        if (!soundBuffer) {
            console.warn(`Cannot find sound: ${sound}`);
            return;
        }

        if (this.audioCtx!.state === "suspended") {
            if (this.playingFirstTime) {
                const timeout = 1000;
                const callTime = performance.now();
                this.audioCtx!.resume()
                .then(()=>{
                    if (callTime+timeout > performance.now()) {
                        this.playingFirstTime = false;
                        this.playSoundF(soundBuffer, (save)?sound:"", soundOptions);
                    }
                });
            }
        }
        else {
            this.playingFirstTime = false;
            this.playSoundF(soundBuffer, (save)?sound:"", soundOptions);
        }
    }

    private playSoundF(soundBuffer: AudioBuffer, saveTo: string="", soundOptions?: SoundOptions) {
        const source = this.audioCtx!.createBufferSource();
        source.buffer = soundBuffer;

        if (soundOptions?.pitch) {
            source.playbackRate.value = soundOptions.pitch;
        }

        const gainNode: GainNode = (
            (soundOptions?.volumeNode)
            ? (this.volumeNodes.get(soundOptions.volumeNode) ?? this.volumeNodes.get("general")!)
            : (this.volumeNodes.get("general")!)
        );

        source.connect(gainNode);
        gainNode.connect(this.audioCtx!.destination);
        source.start(0, soundOptions?.offset);

        if (saveTo) {
            this.sources.set(saveTo, source);
            source.onended = ()=>{
                this.sources.delete(saveTo);
            }
        }
    }
    
}
export const soundManager = new SoundManager();