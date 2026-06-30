// ============================================================
// wallet.js — Solana (Phantom) connect with graceful fallback
// ============================================================
export class Wallet {
  constructor() {
    this.address = null;
    this.listeners = [];
  }
  onChange(fn) { this.listeners.push(fn); }
  _emit() { this.listeners.forEach(f => f(this.address)); }

  short() {
    if (!this.address) return null;
    return this.address.slice(0, 4) + '…' + this.address.slice(-4);
  }

  async connect() {
    // Phantom / Solana
    const provider = window?.solana;
    if (provider && provider.isPhantom) {
      try {
        const res = await provider.connect();
        this.address = res.publicKey.toString();
        this._emit();
        return { ok: true, address: this.address };
      } catch (e) {
        return { ok: false, error: 'Connection rejected.' };
      }
    }
    // generic injected solana
    if (provider && provider.connect) {
      try {
        const res = await provider.connect();
        this.address = (res.publicKey || provider.publicKey)?.toString();
        this._emit();
        return { ok: true, address: this.address };
      } catch (e) {
        return { ok: false, error: 'Connection rejected.' };
      }
    }
    // no wallet -> demo / John Doe identity
    return {
      ok: false,
      noWallet: true,
      error: 'No Solana wallet found. Walking in as John Doe.'
    };
  }

  // assign a deterministic-ish demo inmate number for unconnected users
  inmateNumber() {
    if (this.address) {
      let h = 0;
      for (const c of this.address) h = (h * 31 + c.charCodeAt(0)) % 99999;
      return String(h).padStart(5, '0');
    }
    return '00000';
  }

  disconnect() {
    try { window?.solana?.disconnect?.(); } catch (e) {}
    this.address = null;
    this._emit();
  }
}
