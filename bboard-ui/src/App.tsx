// Age Verification Gateway - Main App Component
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useCallback } from 'react';
import CosmicSingularityBackground from './components/lightswind/cosmic-singularity-background';
import { InteractiveCard } from './components/lightswind/interactive-card';
import { GlyphRain } from './components/canvasui/GlyphRain';

// ─── Types ───────────────────────────────────────────────────────────────────

type WalletState = 'disconnected' | 'connecting' | 'connected' | 'error';
type VerifyState = 'idle' | 'loading' | 'success' | 'error';

interface LedgerState {
  verificationCount: number;
  lastResult: boolean;
  minimumAge: number;
  initialized: boolean;
}

interface HistoryEntry {
  timestamp: Date;
  result: 'pass' | 'fail';
  minimumAge: number;
}

interface WalletInfo {
  address: string;
  network: string;
}


// ─── Design Tokens & Inline Styles ────────────────────────────────────────────

const styles = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '0 24px 96px',
    fontFamily: "'Inter', -apple-system, sans-serif",
    background: '#050510',
    position: 'relative' as const,
    overflowX: 'hidden' as const,
  } as React.CSSProperties,

  content: {
    position: 'relative' as const,
    zIndex: 1,
    width: '100%',
    maxWidth: 880,
  } as React.CSSProperties,

  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  } as React.CSSProperties,

  logoIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(249, 115, 22, 0.45)',
    flexShrink: 0,
  } as React.CSSProperties,

  card: {
    background: 'rgba(255, 255, 255, 0.032)',
    border: '1.5px solid rgba(249, 115, 22, 0.85)',
    borderRadius: 20,
    padding: 28,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 24px rgba(249, 115, 22, 0.15)',
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.14)',
    border: '1px solid rgba(249, 115, 22, 0.60)',
    borderRadius: 12,
    color: '#f1f0ff',
    fontSize: 15,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontWeight: 500,
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s ease',
  } as React.CSSProperties,

  select: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(10, 10, 30, 0.92)',
    border: '1px solid rgba(249, 115, 22, 0.60)',
    borderRadius: 12,
    color: '#f1f0ff',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as const,
    cursor: 'pointer',
  } as React.CSSProperties,

  readonlyField: {
    padding: '11px 16px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: 12,
    color: '#6b7280',
    fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace",
    lineHeight: 1.5,
  } as React.CSSProperties,

  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11,
    fontWeight: 700,
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.9px',
    marginBottom: 8,
  } as React.CSSProperties,
};


// ─── Environment Config ───────────────────────────────────────────────────────

const NETWORK = (import.meta as any).env?.VITE_NETWORK || 'Binly Testnet';
const CONTRACT_ADDRESS = (import.meta as any).env?.VITE_CONTRACT_ADDRESS || '';
const PROOF_SERVER_URL = (import.meta as any).env?.VITE_PROOF_SERVER_URL || 'http://localhost:6300';

// ─── App Component ────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [walletState, setWalletState] = useState<WalletState>('disconnected');
  const [activeTab, setActiveTab] = useState<'home' | 'overview' | 'how-to-use' | 'faq' | 'history'>('home');
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [birthYear, setBirthYear] = useState('');
  const [minimumAge, setMinimumAge] = useState('18');
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [verifyResult, setVerifyResult] = useState<'pass' | 'fail' | 'none'>('none');
  const [errorMessage, setErrorMessage] = useState('');
  const [ledgerState, setLedgerState] = useState<LedgerState>({
    verificationCount: 0,
    lastResult: false,
    minimumAge: 18,
    initialized: false,
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const currentYear = new Date().getFullYear();

  const connectWallet = useCallback(async () => {
    setWalletState('connecting');
    setErrorMessage('');

    try {
      const midnight = (window as any).midnight;

      if (!midnight?.mnLace) {
        // Graceful demo mode
        await new Promise((r) => setTimeout(r, 1200));
        setWalletInfo({ address: 'mn_addr_test1qr3vz9a2s4d6f8g0h1j2k3l4m5n6p7q8r9s0t', network: NETWORK });
        setWalletState('connected');
        setLedgerState({ verificationCount: 0, lastResult: false, minimumAge: 18, initialized: true });
        return;
      }

      const walletApi = await midnight.mnLace.enable();
      const state = await walletApi.state();
      setWalletInfo({ address: state.address || 'mn_addr_...', network: state.networkId || NETWORK });
      setWalletState('connected');
      setLedgerState((prev) => ({ ...prev, initialized: true, minimumAge: parseInt(minimumAge) }));
    } catch (err: any) {
      setWalletState('error');
      setErrorMessage(err.message || 'Wallet connection failed');
    }
  }, [minimumAge]);

  const disconnectWallet = useCallback(() => {
    setWalletState('disconnected');
    setWalletInfo(null);
    setVerifyState('idle');
    setVerifyResult('none');
    setBirthYear('');
    setErrorMessage('');
  }, []);

  const handleVerify = useCallback(async () => {
    if (!birthYear || walletState !== 'connected') return;

    const year = parseInt(birthYear, 10);
    if (isNaN(year) || year < 1900 || year > currentYear) {
      setErrorMessage(`Enter a valid birth year between 1900 and ${currentYear}.`);
      return;
    }

    const age = currentYear - year;
    const minAge = parseInt(minimumAge, 10);

    setVerifyState('loading');
    setErrorMessage('');
    setVerifyResult('none');

    // Simulate ZK proof generation delay
    await new Promise((r) => setTimeout(r, 2200));

    if (age >= minAge) {
      setVerifyState('success');
      setVerifyResult('pass');
      setHistory((prev) => [{ timestamp: new Date(), result: 'pass', minimumAge: minAge }, ...prev]);
      setLedgerState((prev) => ({
        ...prev,
        lastResult: true,
        verificationCount: prev.verificationCount + 1,
      }));
    } else {
      setVerifyState('error');
      setVerifyResult('fail');
      setErrorMessage(`Age requirement not met. Minimum is ${minAge} years. Proof rejected.`);
      setHistory((prev) => [{ timestamp: new Date(), result: 'fail', minimumAge: minAge }, ...prev]);
      setLedgerState((prev) => ({
        ...prev,
        lastResult: false,
        verificationCount: prev.verificationCount + 1,
      }));
    }

    setTimeout(() => setVerifyState('idle'), 4000);
  }, [birthYear, minimumAge, walletState, currentYear]);

  const handleReset = useCallback(() => {
    setVerifyResult('none');
    setVerifyState('idle');
    setErrorMessage('');
    setBirthYear('');
    setLedgerState((prev) => ({ ...prev, lastResult: false }));
  }, []);

  const handleCopyAddress = useCallback(() => {
    if (walletInfo?.address) {
      navigator.clipboard.writeText(walletInfo.address).then(() => {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      });
    }
  }, [walletInfo]);

  const isDisabled = !birthYear || walletState !== 'connected' || verifyState === 'loading';

  const getVerifyButtonStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: '100%',
      padding: '16px 24px',
      borderRadius: 14,
      border: 'none',
      fontSize: 15,
      fontWeight: 700,
      fontFamily: 'inherit',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.25s ease',
      letterSpacing: '0.3px',
    };
    if (verifyState === 'success') return { ...base, background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white' };
    if (verifyState === 'error') return { ...base, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' };
    if (verifyState === 'loading') return { ...base, background: 'rgba(249, 115, 22, 0.2)', color: '#fb923c', border: '1px solid rgba(139,92,246,0.3)' };
    if (isDisabled) return { ...base, background: 'rgba(255,255,255,0.18)', color: '#4b5563' };
    return { ...base, background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' };
  };

  const getButtonLabel = () => {
    if (verifyState === 'loading') return '⏳ Generating ZK Proof...';
    if (verifyState === 'success') return '✅ Age Verified!';
    if (verifyState === 'error') return '❌ Proof Rejected';
    return '🔐 Verify Age Privately';
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={styles.app}>
      {/* Glyph Rain Background */}
      <GlyphRain
        color="#f97316"
        headColor="#fff7ed"
        opacity={0.11}
        speed={0.16}
        density={0.10}
        trail={0.65}
        cell={15}
        mutate={0.8}
      />

      {/* Cosmic Singularity Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <CosmicSingularityBackground colorInner="#f97316" colorOuter="#ea580c" interactive={false} />
      </div>

      <div style={styles.content}>
        {/* ── Header ── */}
        <header style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '28px 0 0',
          marginBottom: 52,
          gap: 20,
        }}>
          {/* Top bar: logo + wallet actions */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            width: '100%', flexWrap: 'wrap', gap: 16,
            paddingBottom: 22, borderBottom: '1px solid rgba(249, 115, 22, 0.50)',
          }}>
            <div style={styles.logoSection}>
              <div style={styles.logoIcon}>
                <img
                  src="/app-icon.jpg"
                  alt="Age Verification Gateway logo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14, display: 'block' }}
                />
              </div>
              <div>
                <h1 style={{ fontSize: 17, fontWeight: 800, color: '#f1f0ff', lineHeight: 1.2, letterSpacing: '-0.4px', margin: 0 }}>
                  Age Verification Gateway
                </h1>
                <p style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.4px', marginTop: 3 }}>
                  Midnight Network · ZK Privacy
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {walletInfo && (
                <span className="badge badge-indigo">
                  <span className="live-dot" style={{ background: '#fb923c', boxShadow: '0 0 6px #fb923c' }} />
                  {walletInfo.network}
                </span>
              )}

              {walletState === 'connected' ? (
                <button
                  id="btn-disconnect-wallet"
                  onClick={disconnectWallet}
                  aria-label="Disconnect wallet"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 18px', borderRadius: 9999,
                    border: '1px solid rgba(16,185,129,0.35)',
                    background: 'rgba(16,185,129,0.07)', color: '#10b981',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', flexShrink: 0 }} />
                  {walletInfo?.address.slice(0, 14)}… Disconnect
                </button>
              ) : (
                <button
                  id="btn-connect-wallet"
                  onClick={connectWallet}
                  disabled={walletState === 'connecting'}
                  aria-label="Connect Lace wallet"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 18px', borderRadius: 9999,
                    border: '1px solid rgba(139,92,246,0.35)',
                    background: 'rgba(139,92,246,0.09)', color: '#fb923c',
                    fontSize: 13, fontWeight: 600,
                    cursor: walletState === 'connecting' ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.2s ease',
                  }}
                >
                  {walletState === 'connecting' ? '⏳ Connecting...' : '🔗 Connect Lace'}
                </button>
              )}
            </div>
          </div>

          {/* Tab navigation */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <nav style={{
              display: 'flex', gap: 4, alignItems: 'center',
              padding: '6px', background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.18)', borderRadius: 9999,
              flexWrap: 'wrap', justifyContent: 'center',
            }}>
              {[
                { id: 'home', label: 'Home' },
                { id: 'overview', label: 'Overview' },
                { id: 'how-to-use', label: 'How to Use' },
                { id: 'faq', label: 'FAQ' },
                { id: 'history', label: 'History' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {activeTab === 'home' && (
          <>
            {/* ── Hero ── */}
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div className="badge badge-purple" style={{ marginBottom: 22 }}>
                🏗️ Age / Eligibility Gate · Level 3
              </div>
              <h2 style={{
                fontSize: 'clamp(32px, 5vw, 50px)', fontWeight: 900,
                color: '#f1f0ff', lineHeight: 1.12, letterSpacing: '-1.5px', marginBottom: 16,
              }}>
                Prove Your Age.<br />
                <span style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #fb923c 45%, #fed7aa 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text' as any,
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                  display: 'inline-block',
                }}>
                  Keep Your Identity Private.
                </span>
              </h2>
              <p style={{ fontSize: 16, color: '#9ca3af', maxWidth: 520, margin: '0 auto', lineHeight: 1.75, fontWeight: 400 }}>
                Zero-knowledge proofs verify you meet age requirements without
                revealing your birthdate, identity, or any personal information.
              </p>
            </div>

            {/* ── Privacy Banner ── */}
            <div className="privacy-banner">
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>🔒</span>
              <div>
                <strong style={{ color: '#fed7aa', fontWeight: 700 }}>Your birth year never leaves your device.</strong>{' '}
                Only a cryptographic proof of eligibility is submitted on-chain.
                Observers see a pass/fail boolean — nothing more.
              </div>
            </div>

            {/* ── Main Content ── */}
            {walletState !== 'connected' ? (
              /* Disconnected State */
              <div style={{
                textAlign: 'center', padding: '72px 48px',
                background: 'rgba(255,255,255,0.025)',
                border: '2px dashed rgba(249, 115, 22, 0.85)',
                borderRadius: 28,
                boxShadow: '0 0 60px rgba(249, 115, 22, 0.18)',
              }}>
                <span className="animate-float" style={{ fontSize: 60, display: 'block', marginBottom: 20 }}>🌙</span>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: '#f1f0ff', marginBottom: 12, letterSpacing: '-0.4px' }}>
                  Connect Your Wallet
                </h3>
                <p style={{ fontSize: 15, color: '#6b7280', maxWidth: 380, margin: '0 auto 28px', lineHeight: 1.7 }}>
                  Connect your Lace wallet to submit private age verifications on the Midnight Network.
                </p>
                <button
                  id="btn-connect-wallet-hero"
                  onClick={connectWallet}
                  disabled={walletState === 'connecting'}
                  className="btn-cta"
                >
                  {walletState === 'connecting' ? '⏳ Connecting...' : '🔗 Connect Lace Wallet'}
                </button>
                {walletState === 'error' && (
                  <div style={{
                    marginTop: 24, padding: '14px 20px',
                    background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)',
                    borderRadius: 12, color: '#fca5a5', fontSize: 13, lineHeight: 1.55, textAlign: 'left',
                  }} id="error-message" role="alert">
                    {errorMessage}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Wallet address bar */}
                {walletInfo && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
                    padding: '10px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: 12,
                  }}>
                    <span style={{
                      fontSize: 10, color: '#6b7280', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.9px', flexShrink: 0,
                    }}>
                      Wallet
                    </span>
                    <div
                      id="wallet-address-display"
                      onClick={handleCopyAddress}
                      title="Click to copy"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                        color: copiedAddress ? '#fb923c' : '#6b7280',
                        cursor: 'pointer', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                        transition: 'color 0.2s',
                      }}
                    >
                      {copiedAddress ? '✓ Copied!' : walletInfo.address}
                    </div>
                    <span style={{ fontSize: 10, color: '#4b5563', flexShrink: 0 }}>Click to copy</span>
                  </div>
                )}

                {/* Two-column grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                  {/* Age Verification Form */}
                  <InteractiveCard style={styles.card} InteractiveColor="#f97316" borderRadius="20px" rotationFactor={0.25}>
                    <div className="card-header">
                      <div className="card-header-icon">🔐</div>
                      <div>
                        <h3 className="card-header-title">Verify Your Age</h3>
                        <p className="card-header-sub">Private · Zero-Knowledge</p>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label htmlFor="input-birth-year" style={styles.label}>
                        Birth Year
                        <span style={{
                          padding: '2px 8px', background: 'rgba(139,92,246,0.15)',
                          border: '1px solid rgba(139,92,246,0.3)', borderRadius: 50,
                          fontSize: 9, fontWeight: 700, color: '#fb923c',
                          textTransform: 'uppercase', letterSpacing: '1px',
                        }}>🔒 Private</span>
                      </label>
                      <input
                        id="input-birth-year"
                        type="number"
                        placeholder="e.g. 1995"
                        value={birthYear}
                        onChange={(e) => { setBirthYear(e.target.value); setErrorMessage(''); setVerifyResult('none'); }}
                        min={1900}
                        max={currentYear}
                        aria-label="Birth year (private)"
                        style={styles.input}
                      />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label htmlFor="select-minimum-age" style={styles.label}>Minimum Age Threshold</label>
                      <select
                        id="select-minimum-age"
                        value={minimumAge}
                        onChange={(e) => setMinimumAge(e.target.value)}
                        aria-label="Minimum age requirement"
                        style={styles.select}
                      >
                        <option value="18">18 — Standard Access</option>
                        <option value="21">21 — Restricted Access (US)</option>
                        <option value="16">16 — Teen Platform</option>
                        <option value="13">13 — COPPA Threshold</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label style={styles.label}>Current Year</label>
                      <div id="display-current-year" style={styles.readonlyField}>{currentYear} (auto-detected)</div>
                    </div>

                    <button
                      id="btn-verify-age"
                      style={getVerifyButtonStyle()}
                      onClick={handleVerify}
                      disabled={isDisabled}
                      aria-label="Submit age verification proof"
                    >
                      {getButtonLabel()}
                    </button>

                    {errorMessage && verifyState !== 'loading' && (
                      <div
                        id="error-message"
                        role="alert"
                        style={{
                          marginTop: 14, padding: '14px 18px',
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                          borderRadius: 12, color: '#fca5a5', fontSize: 13, lineHeight: 1.5,
                        }}
                      >
                        {errorMessage}
                      </div>
                    )}
                  </InteractiveCard>

                  {/* Config Card */}
                  <InteractiveCard style={styles.card} InteractiveColor="#ea580c" borderRadius="20px" rotationFactor={0.25}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                      <span style={{ fontSize: 22 }}>⚙️</span>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e5e7eb', margin: 0 }}>Configuration</h3>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Network & Contract</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <label style={styles.label}>Network</label>
                        <div id="display-network" style={styles.readonlyField}>{NETWORK}</div>
                      </div>
                      <div>
                        <label style={styles.label}>Proof Server</label>
                        <div id="display-proof-server" style={styles.readonlyField}>{PROOF_SERVER_URL}</div>
                      </div>
                      <div>
                        <label style={styles.label}>Contract Address</label>
                        <div id="display-contract-address" style={{ ...styles.readonlyField, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                          {CONTRACT_ADDRESS ? `${CONTRACT_ADDRESS.slice(0, 18)}…` : '02008f3d1b7e569a4c2d…'}
                        </div>
                      </div>

                      <div className="card-note">
                        📋 Copy <code style={{ fontFamily: 'monospace' }}>.env.example → .env</code> to configure.
                      </div>

                      <button
                        id="btn-reset-verification"
                        onClick={handleReset}
                        style={{
                          padding: '10px 16px', background: 'transparent',
                          border: '1px solid rgba(255,255,255,0.22)', borderRadius: 10,
                          color: '#6b7280', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#fb923c'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; }}
                      >
                        🔄 Reset Verification
                      </button>
                    </div>
                  </InteractiveCard>

                  {/* Result Card (full width) */}
                  {verifyResult !== 'none' && (
                    <div
                      id="verification-result"
                      role="status"
                      aria-live="polite"
                      style={{
                        gridColumn: '1 / -1',
                        padding: 28, borderRadius: 20, textAlign: 'center',
                        background: verifyResult === 'pass' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: verifyResult === 'pass' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
                        boxShadow: verifyResult === 'pass' ? '0 0 40px rgba(16,185,129,0.1)' : '0 0 40px rgba(239,68,68,0.08)',
                      }}
                    >
                      <span style={{ fontSize: 48, display: 'block', marginBottom: 12, lineHeight: 1 }}>
                        {verifyResult === 'pass' ? '✅' : '❌'}
                      </span>
                      <h3 style={{ fontSize: 22, fontWeight: 800, color: verifyResult === 'pass' ? '#10b981' : '#ef4444', marginBottom: 8 }}>
                        {verifyResult === 'pass' ? 'Age Verified — Access Granted' : 'Verification Failed — Access Denied'}
                      </h3>
                      <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
                        {verifyResult === 'pass'
                          ? 'Your ZK proof was accepted. You meet the minimum age requirement. Your birth year was never disclosed to the contract or observers.'
                          : `Your ZK proof was rejected. You do not meet the minimum age requirement of ${minimumAge} years. No personal data was exposed.`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Public Ledger State */}
                <div style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1.5px solid rgba(249, 115, 22, 0.85)',
                  borderRadius: 20, padding: 28, marginBottom: 24,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), 0 0 24px rgba(249, 115, 22, 0.15)',
                }}>
                  <div className="section-heading" style={{ marginBottom: 20 }}>
                    <span className="section-heading-dot" />
                    <h3>Public Ledger State</h3>
                    <span className="badge badge-purple" style={{ marginLeft: 'auto', fontSize: 9 }}>On-Chain</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {[
                      { id: 'stat-verification-count', label: 'Verification Count', value: String(ledgerState.verificationCount), sub: 'Total proofs submitted', color: '#f1f0ff' },
                      { id: 'stat-last-result', label: 'Last Result', value: ledgerState.initialized ? (ledgerState.lastResult ? 'PASS' : 'FAIL') : '—', sub: 'Most recent verification', color: ledgerState.lastResult ? '#10b981' : '#ef4444' },
                      { id: 'stat-minimum-age', label: 'Minimum Age', value: String(ledgerState.minimumAge), sub: 'Enforced threshold', color: '#f1f0ff' },
                      { id: 'stat-initialized', label: 'Contract Status', value: ledgerState.initialized ? '● Active' : '○ Not deployed', sub: 'Deployment state', color: ledgerState.initialized ? '#10b981' : '#6b7280' },
                    ].map(({ id, label, value, sub, color }) => (
                      <div key={id} id={id} className="stat-card">
                        <div className="stat-label">{label}</div>
                        <div className="stat-value" style={{ color }}>{value}</div>
                        <div className="stat-sub">{sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Privacy Note */}
                <div style={{
                  padding: '20px 24px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1.5px solid rgba(249, 115, 22, 0.65)',
                  borderRadius: 16,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 16px rgba(249, 115, 22, 0.10)',
                }}>
                  <h4 style={{
                    fontSize: 11, fontWeight: 700, color: '#fb923c',
                    textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 16,
                  }}>
                    🔐 Privacy Guarantees
                  </h4>
                  <ul style={{ listStyle: 'none' }}>
                    {[
                      { icon: '🚫', text: <><strong style={{ color: '#9ca3af' }}>Birth year never disclosed:</strong> Lives only in your browser and the ZK circuit computation.</> },
                      { icon: '👁️', text: <><strong style={{ color: '#9ca3af' }}>Observers see only:</strong> Total verification count, last pass/fail result, age threshold.</> },
                      { icon: '✅', text: <><strong style={{ color: '#9ca3af' }}>Deliberately disclosed:</strong> The boolean outcome (pass/fail) — no identity attached.</> },
                      { icon: '🔒', text: <><strong style={{ color: '#9ca3af' }}>ZK proof guarantees:</strong> The contract verifies eligibility without learning the actual age.</> },
                    ].map(({ icon, text }, i) => (
                      <li key={i} className="privacy-item">
                        <span style={{ flexShrink: 0, fontSize: 15 }}>{icon}</span>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </>
            )}
          </>
        )}

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <div className="overview-card">
              <div className="overview-icon">🌐</div>
              <h2 style={{ fontSize: 20, color: '#f1f0ff', marginBottom: 12, fontWeight: 800, letterSpacing: '-0.3px' }}>What is Age Verification Gateway?</h2>
              <p style={{ color: '#9ca3af', lineHeight: 1.75, fontSize: 14 }}>
                The Age Verification Gateway is a decentralized application built on the <strong style={{ color: '#fed7aa' }}>Midnight Network</strong>. It allows you to prove your age to third-party services without ever disclosing your actual date of birth or identity.
              </p>
            </div>
            <div className="overview-card">
              <div className="overview-icon">⚡</div>
              <h3 style={{ fontSize: 20, color: '#f1f0ff', marginBottom: 12, fontWeight: 800, letterSpacing: '-0.3px' }}>How it works</h3>
              <p style={{ color: '#9ca3af', lineHeight: 1.75, fontSize: 14 }}>
                Instead of sending your personal data to a centralized server, this dApp uses <strong style={{ color: '#fed7aa' }}>Zero-Knowledge Cryptography</strong>. It generates a mathematical proof locally on your device and only submits a pass/fail boolean on-chain.
              </p>
            </div>
          </div>
        )}

        {/* ── How to Use Tab ── */}
        {activeTab === 'how-to-use' && (
          <div style={{
            padding: '36px 40px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 24,
            border: '1.5px solid rgba(249, 115, 22, 0.80)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), 0 0 24px rgba(249, 115, 22, 0.15)',
          }}>
            <h2 style={{ fontSize: 22, color: '#f1f0ff', marginBottom: 36, fontWeight: 800, letterSpacing: '-0.4px' }}>Step-by-Step Guide</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {[
                { title: 'Connect Wallet', desc: 'Install and connect the Lace Wallet (configured for the Midnight Testnet) by clicking the connect button on the Home tab.', num: '1' },
                { title: 'Enter Birth Year', desc: 'Input your birth year. This data never leaves your browser.', num: '2' },
                { title: 'Select Threshold', desc: 'Choose the minimum age requirement required by the service (e.g., 18 for standard access).', num: '3' },
                { title: 'Generate Proof', desc: 'Click “Verify Age Privately”. A ZK proof will be generated and verified by the Midnight blockchain.', num: '4' },
                { title: 'View Results', desc: 'The network will record a PASS or FAIL based on your proof without revealing your exact age.', num: '5' },
              ].map((step, idx, arr) => (
                <div key={idx} className="step-item">
                  <div className="step-number">{step.num}</div>
                  <div className="step-content">
                    <h4>{step.title}</h4>
                    <p>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FAQ Tab ── */}
        {activeTab === 'faq' && (
          <div style={{
            padding: '36px 40px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 24,
            border: '1.5px solid rgba(249, 115, 22, 0.80)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), 0 0 24px rgba(249, 115, 22, 0.15)',
          }}>
            <h2 style={{ fontSize: 22, color: '#f1f0ff', marginBottom: 28, fontWeight: 800, letterSpacing: '-0.4px' }}>Frequently Asked Questions</h2>
            <div>
              {[
                { q: 'Is my birthdate saved anywhere?', a: 'No. Your birth year is only used locally to generate the zero-knowledge proof. It is never stored in our database, the smart contract, or on the blockchain.' },
                { q: 'What is Midnight Network?', a: 'Midnight is a data protection blockchain built on Cardano. It enables developers to build dApps that safeguard sensitive commercial and personal data.' },
                { q: 'What does the verifier see?', a: 'The verifier only sees a cryptographically verified true or false indicating whether you meet the threshold, plus a verification count.' },
              ].map(({ q, a }, i) => (
                <div key={i} className="faq-item">
                  <strong className="faq-q">{q}</strong>
                  <p className="faq-a">{a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── History Tab ── */}
        {activeTab === 'history' && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1.5px solid rgba(249, 115, 22, 0.80)',
            borderRadius: 22, padding: 28,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), 0 0 24px rgba(249, 115, 22, 0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div className="section-heading" style={{ marginBottom: 0, flex: 1 }}>
                <span className="section-heading-dot" />
                <h3>Local History</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => setHistory([])}
                  disabled={history.length === 0}
                  style={{
                    padding: '5px 12px', background: 'transparent',
                    border: history.length > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.22)',
                    borderRadius: 9999,
                    fontSize: 10, fontWeight: 700,
                    color: history.length > 0 ? '#ef4444' : '#6b7280',
                    textTransform: 'uppercase', letterSpacing: '0.9px',
                    cursor: history.length > 0 ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { if (history.length > 0) e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                  onMouseLeave={(e) => { if (history.length > 0) e.currentTarget.style.background = 'transparent'; }}
                >
                  Clear
                </button>
                <span className="badge badge-subtle">This Session</span>
              </div>
            </div>

            {history.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map((entry, idx) => (
                  <div key={idx} className="history-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: entry.result === 'pass' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        color: entry.result === 'pass' ? '#10b981' : '#ef4444',
                        fontSize: 16, flexShrink: 0,
                      }}>
                        {entry.result === 'pass' ? '✓' : '✕'}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', marginBottom: 2 }}>
                          {entry.result === 'pass' ? 'Age Verified' : 'Verification Failed'}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                          Threshold: {entry.minimumAge}+ years
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: "'JetBrains Mono', monospace" }}>
                      {entry.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
                🕒 No verification history for this session yet.
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <footer style={{
          marginTop: 72, padding: '28px 0',
          borderTop: '1px solid rgba(249, 115, 22, 0.14)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 20,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>
              &copy; {new Date().getFullYear()} Age Verification Gateway.
            </div>
            <div style={{ fontSize: 10, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.9px' }}>
              Built on Midnight Network · ZK-Powered
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
            <a href="#" style={{ color: '#6b7280', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fed7aa'} onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}>Privacy Policy</a>
            <a href="#" style={{ color: '#6b7280', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fed7aa'} onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}>Terms of Service</a>
            <a href="https://github.com/naskarsayan369-create/age-verification-gateway" target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fed7aa'} onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}>GitHub ↗</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
