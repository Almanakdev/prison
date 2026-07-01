// ============================================================
// chat.js — text + voice interaction, per-room NPC personality
// Uses Web Speech API (SpeechRecognition + speechSynthesis) when
// available, with graceful fallback to text-only.
// ============================================================

const PERSONA = {
  interrogation: {
    name: 'THE BLACK BULL',
    color: '#d8b23e',
    lines: [
      "Sit. Tell me the exact candle you sold The Black Bull on.",
      "You had diamond hands for a week. Then you blinked.",
      "Two X. You sold at two X. The chart did forty. I have the receipts.",
      "Paper hands always say 'I was up'. Up isn't out, inmate.",
      "Every wallet that jeeted is on the wall behind me. Yours is lit up.",
      "You didn't get rugged. You rugged yourself and walked in here.",
      "The ring in my nose cost more than your entire exit. Think on that.",
      "Confess the sell and maybe — maybe — you graduate to the yard.",
      "Fear is just a small loss with good PR. You let it close your position.",
      "I don't jail holders. I jail the ones who folded. That's you."
    ],
    greet: "So. Another paper hand. Sit down and tell me when you sold The Black Bull."
  },
  field: {
    name: 'GUARD MARGIN',
    color: '#5cc24a',
    lines: [
      "Morning. That green chart on the tower? That's the run you sold.",
      "Fence is five meters. The candles on the other side are taller.",
      "You can cope on the bench all you want — the bags don't come back.",
      "Every green candle up there is a year you added to your sentence.",
      "The Bull lets you watch the pump. That's the whole punishment.",
      "Run the track. It loops. So does the regret.",
      "Diamond hands got the penthouse. You got the pen. Funny how that works.",
      "Hoop's open. Air-balling still beats checking your sell price.",
      "Don't ask me the market cap. You sold your right to know.",
      "Yard time ends when the bell rings. The chart keeps printing after."
    ],
    greet: "Out for yard time? Stay off the fence and keep your eyes off the chart… you'll just sell again."
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
    this.playerName = 'PAPER HAND';

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

  // a passing inmate (or any side character) says a line into the log
  npcSay(name, text) {
    this._addMsg(name, text, 'npc');
    this._speak(text);
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
    if (/escape|out|leave|free|exit/.test(t))
      reply = this.room === 'interrogation'
        ? "Exit? You already took your exit liquidity. There's no exit from that."
        : "Only diamond hands walk out of here. You sold. You stay.";
    else if (/sold|sell|profit|took profit|cashed|jeet/.test(t))
      reply = this.room === 'interrogation'
        ? "There it is. You said it yourself. Profit isn't a crime — selling THIS early is."
        : "Yeah, you sold. So did everyone on this bench. Welcome to the pen.";
    else if (/diamond|hold|holding|hodl|still in/.test(t))
      reply = "Diamond hands don't end up in my prison. Nice try.";
    else if (/pump|moon|chart|candle|price|market cap|ath/.test(t))
      reply = this.room === 'interrogation'
        ? "The chart pumped the second you clicked sell. They always do."
        : "Look at it. Green all the way up. That could've been your sentence — paid out instead of served.";
    else if (/innocent|didn'?t|not me|forced|fear|scared|panic/.test(t))
      reply = "Fear sold those bags, not the market. Tell it to the wall.";
    else if (/sorry|regret|mistake|wrong/.test(t))
      reply = this.room === 'interrogation'
        ? "Regret doesn't reopen a position. But it's a start. Keep talking."
        : "Everyone in this yard is sorry. The chart doesn't read apologies.";
    else if (/help|please/.test(t))
      reply = this.room === 'interrogation'
        ? "Help comes after the confession, not before. When did you sell?"
        : "Best help out here is shade and silence. Don't open the chart.";
    else if (/hello|hey|hi\b|morning|gm/.test(t))
      reply = this.persona.greet;
    else if (/ansem|wallet|chain|solana|crypto|token|bull/.test(t))
      reply = this.room === 'interrogation'
        ? "The Black Bull remembers every wallet that folded. On-chain forever. Including yours."
        : "On-chain or not, the Bull already read your sell. Number's the same in here.";
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
