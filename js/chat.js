// ============================================================
// chat.js — text + voice interaction, per-room NPC personality
// Uses Web Speech API (SpeechRecognition + speechSynthesis) when
// available, with graceful fallback to text-only.
// ============================================================

const PERSONA = {
  interrogation: {
    name: 'DETECTIVE GRIM',
    color: '#9bb0c8',
    lines: [
      "Sit down. We're going to be here a while.",
      "Funny — everybody's innocent until I open the folder.",
      "You think the trenches dug themselves? Start talking.",
      "I've got all night. The bulb's got all night. You?",
      "Every block you mined is in this file. Every one.",
      "Nod all you want. The mirror's recording the silence too.",
      "Confession's cheaper than a sentence. Think about it.",
      "Where were you when the chain split? Don't lie to the lamp."
    ],
    greet: "So. The famous inmate finally walks in. Take a seat."
  },
  field: {
    name: 'GUARD HOLLOWAY',
    color: '#9ed46a',
    lines: [
      "Morning. Don't get used to the sunlight.",
      "Fence is five meters and the wire bites. Don't test it.",
      "You can run the track all you want — it loops back to the cell.",
      "Fresh air's the one thing they let you keep out here.",
      "Tower sees everything. Wave if you want, Holloway's bored.",
      "Grass is wet. So's the inside of that block. Pick your damp.",
      "Hoop's open. Losing at basketball still beats lockdown.",
      "Yard time ends when the bell rings. It always rings."
    ],
    greet: "Out for yard time, huh? Stay on this side of the wire."
  }
};

export class ChatSystem {
  constructor({ logEl, inputEl, sendEl, micEl, toast }) {
    this.log = logEl;
    this.input = inputEl;
    this.send = sendEl;
    this.mic = micEl;
    this.toast = toast;
    this.room = 'field';
    this.persona = PERSONA.field;
    this.playerName = 'JOHN DOE';

    this._setupVoice();
    this.send.addEventListener('click', () => this._submit());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._submit();
    });
    this.mic.addEventListener('click', () => this._toggleMic());
  }

  setRoom(room, playerName) {
    this.room = room;
    this.persona = PERSONA[room] || PERSONA.field;
    this.playerName = playerName || this.playerName;
    this.log.innerHTML = '';
    this._addMsg(this.persona.name, this.persona.greet, 'npc');
  }

  _submit() {
    const text = this.input.value.trim();
    if (!text) return;
    this.input.value = '';
    this._addMsg(this.playerName, text, 'me');
    this._respond(text);
  }

  _respond(text) {
    // lightweight keyword-aware NPC
    const t = text.toLowerCase();
    let reply;
    if (/escape|out|leave|free/.test(t))
      reply = this.room === 'interrogation'
        ? "Escape? Cute. Nobody's left these trenches. You won't be the first."
        : "Escape talk near the fence? Bold. The wire's listening too.";
    else if (/innocent|didn'?t|not me/.test(t))
      reply = "Sure. Tell it to the folder.";
    else if (/help|please/.test(t))
      reply = this.room === 'interrogation'
        ? "Help comes after the confession, not before."
        : "Best help I can give you out here is shade. Go stand by the tree.";
    else if (/hello|hey|hi\b|morning/.test(t))
      reply = this.persona.greet;
    else if (/wallet|chain|solana|crypto/.test(t))
      reply = "On-chain or not, your number's the same in here.";
    else
      reply = this.persona.lines[Math.floor(Math.random() * this.persona.lines.length)];

    setTimeout(() => {
      this._addMsg(this.persona.name, reply, 'npc');
      this._speak(reply);
    }, 500 + Math.random() * 500);
  }

  _addMsg(who, text, cls) {
    const d = document.createElement('div');
    d.className = 'msg ' + cls;
    d.innerHTML = `<span class="who">${who}</span>${escapeHtml(text)}`;
    this.log.appendChild(d);
    this.log.scrollTop = this.log.scrollHeight;
  }

  // ---- voice output ----
  _speak(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = this.room === 'interrogation' ? 0.92 : 1.0;
      u.pitch = this.room === 'interrogation' ? 0.7 : 0.9;
      u.volume = 0.9;
      window.speechSynthesis.speak(u);
    } catch (e) { /* no-op */ }
  }

  // ---- voice input ----
  _setupVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { this.recog = null; return; }
    this.recog = new SR();
    this.recog.lang = 'en-US';
    this.recog.interimResults = false;
    this.recog.maxAlternatives = 1;
    this.recog.onresult = (e) => {
      const said = e.results[0][0].transcript;
      this._addMsg(this.playerName, said, 'me');
      this._respond(said);
    };
    this.recog.onend = () => { this.listening = false; this.mic.classList.remove('rec'); };
    this.recog.onerror = () => { this.listening = false; this.mic.classList.remove('rec'); };
  }

  _toggleMic() {
    if (!this.recog) {
      this.toast('Voice input not supported in this browser — use text.');
      return;
    }
    if (this.listening) { this.recog.stop(); return; }
    try {
      this.recog.start();
      this.listening = true;
      this.mic.classList.add('rec');
    } catch (e) {
      this.toast('Mic busy — try again.');
    }
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
