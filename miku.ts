namespace miku {

  interface MikuEventCallback {
    (arg1: any, arg2?: any): void;
  }

  interface MikuEventListener {
    eventName: string
    callback: MikuEventCallback
  }

  enum MidiMessage {
    NOTE_OFF = 0x80,
    NOTE_ON = 0x90,
    POLY_PRESSURE = 0xA0,
    CONTROL_CHANGE = 0xB0,
    PROGRAM_CHANGE = 0xC0,
    CHANNEL_PRESSURE = 0xD0,
    PITCH_BEND = 0xE0,
    SYS_EX = 0xF0
  }

  class Miku {
    private midiChannel: number = 0;
    private input: WebMidi.MIDIInput = null;
    private output: WebMidi.MIDIOutput = null;
    private eventListeners: MikuEventListener[] = [];

    constructor(private midi: WebMidi.MIDIAccess) {
    }

    private static instance: Miku; // Singleton

    private static PHONEME = {
      'あ': 0x00, 'い': 0x01, 'う': 0x02, 'え': 0x03, 'お': 0x04,
      'か': 0x05, 'き': 0x06, 'く': 0x07, 'け': 0x08, 'こ': 0x09,
      'が': 0x0A, 'ぎ': 0x0B, 'ぐ': 0x0C, 'げ': 0x0D, 'ご': 0x0E,
      'きゃ': 0x0F, 'きゅ': 0x10, 'きょ': 0x11,
      'ぎゃ': 0x12, 'ぎゅ': 0x13, 'ぎょ': 0x14,
      'さ': 0x15, 'すぃ': 0x16, 'す': 0x17, 'せ': 0x18, 'そ': 0x19,
      'ざ': 0x1A, 'ずぃ': 0x1B, 'ず': 0x1C, 'ぜ': 0x1D, 'ぞ': 0x1E,
      'しゃ': 0x1F, 'し': 0x20, 'しゅ': 0x21, 'しぇ': 0x22, 'しょ': 0x23,
      'じゃ': 0x24, 'じ': 0x25, 'じゅ': 0x26, 'じぇ': 0x27, 'じょ': 0x28,
      'た': 0x29, 'てぃ': 0x2A, 'とぅ': 0x2B, 'て': 0x2C, 'と': 0x2D,
      'だ': 0x2E, 'でぃ': 0x2F, 'どぅ': 0x30, 'で': 0x31, 'ど': 0x32,
      'てゅ': 0x33, 'でゅ': 0x34,
      'ちゃ': 0x35, 'ち': 0x36, 'ちゅ': 0x37, 'ちぇ': 0x38, 'ちょ': 0x39,
      'つぁ': 0x3A, 'つぃ': 0x3B, 'つ': 0x3C, 'つぇ': 0x3D, 'つぉ': 0x3E,
      'な': 0x3F, 'に': 0x40, 'ぬ': 0x41, 'ね': 0x42, 'の': 0x43,
      'にゃ': 0x44, 'にゅ': 0x45, 'にょ': 0x46,
      'は': 0x47, 'ひ': 0x48, 'ふ': 0x49, 'へ': 0x4A, 'ほ': 0x4B,
      'ば': 0x4C, 'び': 0x4D, 'ぶ': 0x4E, 'べ': 0x4F, 'ぼ': 0x50,
      'ぱ': 0x51, 'ぴ': 0x52, 'ぷ': 0x53, 'ぺ': 0x54, 'ぽ': 0x55,
      'ひゃ': 0x56, 'ひゅ': 0x57, 'ひょ': 0x58,
      'びゃ': 0x59, 'びゅ': 0x5A, 'びょ': 0x5B,
      'ぴゃ': 0x5C, 'ぴゅ': 0x5D, 'ぴょ': 0x5E,
      'ふぁ': 0x5F, 'ふぃ': 0x60, 'ふゅ': 0x61, 'ふぇ': 0x62, 'ふぉ': 0x63,
      'ま': 0x64, 'み': 0x65, 'む': 0x66, 'め': 0x67, 'も': 0x68,
      'みゃ': 0x69, 'みゅ': 0x6A, 'みょ': 0x6B,
      'や': 0x6C, 'ゆ': 0x6D, 'よ': 0x6E,
      'ら': 0x6F, 'り': 0x70, 'る': 0x71, 'れ': 0x72, 'ろ': 0x73,
      'りゃ': 0x74, 'りゅ': 0x75, 'りょ': 0x76,
      'わ': 0x77, 'うぃ': 0x78, 'うぇ': 0x79, 'うぉ': 0x7A,
      'ん': 0x7B,
    };

    /**
     * Convert Map to Array of map values.
     * @param map 
     */
    private static mapToValues<T>(map: Map<any, T>): T[] {

      let array: T[] = [];

      let it = map.values();
      for (let o = it.next(); !o.done; o = it.next()) {
        array.push(o.value);
      }

      return array;
    }

    /**
     * Create instance of Miku. If already called, return singleton instance.
     * @param callback 
     */
    static init(callback?: (miku: Miku) => void) {

      return new Promise((resolve, reject) => {

        // already initialized
        if (Miku.instance) return resolve(Miku.instance);

        // request MIDI Access
        window.navigator.requestMIDIAccess({ sysex: true })
          .then((midi) => {

            let miku = new Miku(midi);

            // auto detect input
            let inputs = Miku.mapToValues(midi.inputs);
            let mikuInputWasFound = inputs.some((input) => {
              if (/NSX-39/.test(input.name)) {
                miku.input = input;
                input.onmidimessage = miku.onMIDIMessage.bind(miku);
                return true;
              }
            });

            if (!mikuInputWasFound) {
              miku.input = inputs[0];
            }

            // auto detect output
            let outputs = Miku.mapToValues(midi.outputs);
            let mikuOutputWasFound = outputs.some(output => {
              if (/NSX-39/.test(output.name)) {
                miku.output = output;
                return true;
              }
            });

            if (!mikuOutputWasFound) {
              miku.output = outputs[0];
            }

            // Store singleton instnace
            Miku.instance = miku;
            resolve(miku);

            // optional callback func
            if (callback) {
              callback(miku);
            }

          }).catch(reject);
      });
    }

    /**
     * Set lyrics.
     * @param lyrics {Array<String>|String}
     */
    lyrics(lyrics: string[] | string): Miku {

      let msg: number[] = [0xF0, 0x43, 0x79, 0x09, 0x11, 0x0A, 0x00];
      let arr: string[];

      if (Array.isArray(lyrics)) {
        arr = lyrics;
      } else if (typeof lyrics === 'string') {
        arr = lyrics.split(/[\s,　]/);
      } else {
        return;
      }

      arr.forEach(lyric => {
        if (lyric in Miku.PHONEME) {
          msg.push(Miku.PHONEME[lyric]);
        }
      });

      msg.push(0xF7);
      this.output.send(msg);

      return this;
    };

    /**
     * Send note off
     */
    noteOff(noteNumber: number, velocity: number, timestamp: number): Miku {

      if (!this.output) return this;

      this.output.send([MidiMessage.NOTE_OFF | this.midiChannel, noteNumber, velocity], timestamp);
      this.emit('noteOff', noteNumber, velocity);

      return this;
    };

    /**
     * Send note on
     */
    noteOn(noteNumber: number, velocity: number, timestamp: number): Miku {

      if (!this.output) return this;

      this.output.send([MidiMessage.NOTE_ON | this.midiChannel, noteNumber, velocity], timestamp);
      this.emit('noteOn', noteNumber, velocity);

      return this;
    };

    /**
     * Send control change
     */
    controlChange(controller: number, value: number, timestamp: number): Miku {

      if (!this.output) return this;

      this.output.send([MidiMessage.CONTROL_CHANGE | this.midiChannel, controller, value], timestamp);
      this.emit('controlChange', controller, value);

      return this;
    };


    /**
     * Send control change
     */
    programChange(program: number, timestamp: number): Miku {

      if (!this.output) return this;

      this.output.send([MidiMessage.PROGRAM_CHANGE | this.midiChannel, program], timestamp);
      this.emit('programChange', program);

      return this;
    };

    /**
     * Send pitch bend
     */
    pitchBend(bend: number, timestamp: number): Miku {

      if (!this.output) return this;

      this.output.send([MidiMessage.PITCH_BEND | this.midiChannel, bend & 0x7F, bend >> 7 & 0x7F], timestamp);
      this.emit('pitchBend', bend);

      return this;
    };

    /**
     * Send all notes off
     */
    allNotesOff(timestamp: number): Miku {

      if (!this.output) return this;

      this.output.send([MidiMessage.CONTROL_CHANGE | this.midiChannel, 0x7b, 0x00], timestamp);

      return this;
    };

    /**
     * Send all sound off
     */
    allSoundOff(timestamp: number): Miku {

      if (!this.output) return this;

      this.output.send([MidiMessage.CONTROL_CHANGE | this.midiChannel, 0x78, 0x00], timestamp);
      return this;
    };

    /**
     * MIDI Event handler
     */
    private onMIDIMessage(event: WebMidi.MIDIMessageEvent) {

      let data = event.data;

      switch (data[0]) {
        case MidiMessage.NOTE_OFF:
          this.emit('noteOff', data[1], data[2]);
          break;
        case MidiMessage.NOTE_ON:
          this.emit('noteOn', data[1], data[2]);
          break;
        case MidiMessage.CONTROL_CHANGE:
          this.emit('controlChange', data[1], data[2]);
          break;
        case MidiMessage.PITCH_BEND:
          let bend = data[2] << 7 | data[1]
          this.emit('pitchBend', bend);
          break;
        case MidiMessage.SYS_EX:
          this.emit('sysEx', data);
          break;
      }
    };

    /**
     * Add event listener.
     */
    addEventListener(eventName: string, callback: MikuEventCallback): Miku {

      this.eventListeners.push({ eventName, callback });

      return this;
    }

    /**
     * Add event listener.
     */
    on(eventName: string, callback: MikuEventCallback): Miku {
      return this.addEventListener(eventName, callback);
    }

    /**
     * Send event.
     */
    emit(eventName: string, arg1: any, arg2?: any): Miku {

      this.eventListeners.forEach((listener) => {
        if (listener.eventName === eventName) {
          listener.callback(arg1, arg2);
        }
      });

      return this;
    }

    /**
     * Remove event listener.
     */
    removeEventListener(eventName: string, callback: MikuEventCallback): Miku {

      this.eventListeners.forEach((listener, idx) => {
        if (listener.eventName === eventName && listener.callback === callback) {
          this.eventListeners.splice(idx, 1);
        }
      });

      return this;
    }

    /**
     * Remove event listener.
     */
    off(eventName: string, callback): Miku {
      return this.removeEventListener(eventName, callback);
    }
  }

  // Compatibility for old versions
  if (!window['Miku']) {
    window['Miku'] = Miku;
  }
}