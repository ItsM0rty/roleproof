import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { analyze } from './core/engine';
import type { Citation, Extraction, Profile } from './core/schema';
import { defaultProfile, allSamples as samples } from './data/samples';
import './styles.css';

function Icon({ name, size = 18 }: { name: 'arrow' | 'check' | 'document' | 'download' | 'plus'; size?: number }) {
  const paths = { arrow: 'M5 12h14m-6-6 6 6-6 6', check: 'm5 12 4 4L19 6', document: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm0 0v6h6M8 13h8M8 17h5', download: 'M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4', plus: 'M12 5v14M5 12h14' };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

const countryOptions = [['NP','Nepal'],['US','United States'],['CA','Canada'],['GB','United Kingdom'],['DE','Germany'],['FR','France'],['BR','Brazil'],['IN','India'],['AU','Australia'],['NG','Nigeria'],['JP','Japan'],['MX','Mexico']];
type Meta = { durationMs: number; model: string; cached: boolean; usage: { inputTokens: number; outputTokens: number } };

function App() {
  const [sample, setSample] = useState(samples[0]);
  const [custom, setCustom] = useState(false);
  const [text, setText] = useState(samples[0].text);
  const [facts, setFacts] = useState<Extraction | null>(samples[0].facts);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [skillsInput, setSkillsInput] = useState(defaultProfile.skills.join(', '));
  const [selected, setSelected] = useState<Citation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const sourceRef = useRef<HTMLPreElement>(null);
  const requestId = useRef(0);
  const analysis = facts ? analyze(text, facts, profile) : null;

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/health', { signal: controller.signal }).then(r => r.json()).then(data => setLiveEnabled(data.liveEnabled === true)).catch(() => undefined);
    return () => controller.abort();
  }, []);

  function chooseSample(id: string) {
    const next = samples.find(s => s.id === id)!;
    requestId.current++;
    setSample(next); setCustom(false); setText(next.text); setFacts(next.facts);
    setSelected(null); setError(''); setBusy(false); setMeta(null);
  }

  function openCustom() {
    requestId.current++;
    setCustom(true); setText(''); setFacts(null); setSelected(null); setError(''); setBusy(false); setMeta(null);
  }

  async function run() {
    const id = ++requestId.current;
    setBusy(true); setError(''); setFacts(null); setMeta(null); setSelected(null);
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, profile }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Analysis failed.');
      if (id === requestId.current) { setFacts(data.facts); setMeta(data.meta); }
    } catch (e) { if (id === requestId.current) setError(e instanceof Error ? e.message : 'Could not connect to the local API.'); }
    finally { if (id === requestId.current) setBusy(false); }
  }

  function showCitation(citation: Citation) {
    setSelected(citation);
    requestAnimationFrame(() => sourceRef.current?.querySelector('mark')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }

  function download() {
    const blob = new Blob([JSON.stringify({ version: 1, mode: custom ? 'live' : sample.source ? 'public-excerpt-replay' : 'synthetic-replay', source: custom ? undefined : sample.source, profile, text, facts, analysis, meta }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'roleproof-explanation.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const supported = analysis?.findings.filter(f => f.active && f.status === 'supported').length ?? 0;
  return <>
    <header className="topbar">
      <a href="/" className="brand">RoleProof<span className="prototype">PROTOTYPE</span></a>
      <nav aria-label="Main navigation"><a href="https://github.com/ItsM0rty/roleproof" target="_blank" rel="noreferrer">Source & methodology <Icon name="arrow" size={15} /></a><span className="local-status"><i /> Local workspace</span></nav>
    </header>
    <main>
      <section className="intro">
        <div><p className="eyebrow">Independent prototype</p><h1>A good fit.<br /><span>With the facts to back it.</span></h1></div>
        <p className="intro-note">A relevant title is a start. See where a role meets your preferences, where it doesn’t, and what still needs an answer.</p>
      </section>

      <section className="workspace" aria-label="Job match workspace">
        <div className="workspace-bar"><span><i className="tiny-square" /> MATCH WORKSPACE</span><span>Evidence first. Uncertainty visible.</span></div>
        <div className="workspace-grid">
          <aside className="preferences">
            <div className="section-heading"><span className="step">01</span><h2>Your preferences</h2></div>
            <p className="muted small">Change a preference. The explanation updates immediately.</p>
            <label htmlFor="country">Based in</label>
            <select id="country" value={profile.country} onChange={e => setProfile({ ...profile, country: e.target.value })}>{countryOptions.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>
            <label htmlFor="salary">Minimum annual base salary</label>
            <div className="salary-input"><select aria-label="Salary currency" value={profile.currency} onChange={e => setProfile({ ...profile, currency: e.target.value as Profile['currency'] })}>{['USD','EUR','GBP','CAD','AUD'].map(c => <option key={c}>{c}</option>)}</select><input id="salary" type="number" min="0" max="10000000" step="1000" value={profile.minimumSalary} onChange={e => setProfile({ ...profile, minimumSalary: Math.max(0, Math.min(10000000, Number(e.target.value))) })} /></div>
            <p className="field-note">Cash before bonuses or equity. Set 0 to skip.</p>
            <label htmlFor="skills">Preferred technologies</label>
            <input id="skills" value={skillsInput} maxLength={500} placeholder="React, TypeScript" onChange={e => { setSkillsInput(e.target.value); setProfile({ ...profile, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean).slice(0,12).map(s => s.slice(0,60)) }); }} />
            <p className="field-note">Separate with commas. A missing mention stays unknown.</p>
            <div className="legend"><h3>Three useful answers</h3><p><span className="status-dot supported" /><strong>Supported</strong><span>Evidence meets your preference</span></p><p><span className="status-dot contradicted" /><strong>Contradicted</strong><span>Evidence points to a mismatch</span></p><p><span className="status-dot unknown" /><strong>Unknown</strong><span>Missing, ambiguous, or conflicting</span></p></div>
            <div className="preference-footer"><span className="line-icon"><Icon name="document" /></span><p>Preferences are compared locally. Live extraction sends only the listing to the model provider.</p></div>
          </aside>

          <div className="match-column">
            <div className="section-heading"><span className="step">02</span><h2>The explanation</h2></div>
            <div className="sample-control"><label htmlFor="sample">Explore an example</label><select id="sample" value={custom ? '' : sample.id} onChange={e => chooseSample(e.target.value)}><option value="" disabled>Custom listing</option>{samples.map(s => <option key={s.id} value={s.id}>{s.company} · {s.subtitle}</option>)}</select></div>
            <div className="role-heading"><div className="company-avatar">{custom ? <Icon name="document" size={24} /> : sample.company[0]}</div><div><span className="company-name">{custom ? 'Your listing' : sample.company}</span><h3>{custom ? 'Analyze a job description' : sample.title}</h3></div></div>
            <span className="mode-label">{custom ? 'LIVE EXTRACTION' : sample.source ? 'PUBLIC EXCERPT · SAVED FACTS' : 'SYNTHETIC EXAMPLE · SAVED FACTS'}</span>
            {analysis ? <>
              <div className={`verdict ${analysis.verdict === 'Preferences supported' ? 'positive' : ''}`} aria-live="polite"><div className="verdict-title"><span className="verdict-symbol">{analysis.verdict === 'Preferences supported' ? <Icon name="check" size={23} /> : '?'}</span><h3>{analysis.verdict}</h3></div><p>{supported} of {analysis.findings.filter(f => f.active).length} preferences supported by the listing. {analysis.verdict === 'Needs clarification' ? 'Keep this role in view and resolve the open questions.' : analysis.verdict === 'Potential mismatch' ? 'Review the specific restriction before investing time.' : 'Review the full requirements before applying.'}</p></div>
              <div className="findings">{analysis.findings.map((finding, i) => <article key={finding.dimension} className="finding"><div className="finding-top"><h4><span className="finding-index">0{i+1}</span>{finding.label}</h4><span className={`status-pill ${finding.status}`}>{finding.active ? finding.status : 'No preference'}</span></div><p>{finding.detail}</p><div className="citation-buttons">{Array.from(new Map(finding.citations.map(c => [c.start, c])).values()).map((c, j) => <button className={`citation-button ${selected?.start === c.start ? 'selected' : ''}`} key={`${c.start}-${j}`} onClick={() => showCitation(c)}><Icon name="document" size={12} /> Source {j + 1}<span aria-hidden="true">↗</span></button>)}</div></article>)}</div>
              {!!analysis.warnings.length && <div className="warning" role="status">{analysis.warnings.map(w => <p key={w}>{w}</p>)}</div>}
              <button className="export-button" onClick={download}><Icon name="download" size={15} /> Export explanation <span>JSON</span></button>
            </> : <div className="empty-state" aria-live="polite"><Icon name="document" size={30} /><h3>{busy ? 'Reading the listing…' : 'Bring a role into focus.'}</h3><p>{busy ? 'Extracting facts, checking quotations, and comparing your preferences.' : 'Paste a job description in the source panel, then analyze it to see the evidence.'}</p></div>}
            {meta && <p className="run-meta">{meta.model} · {(meta.durationMs / 1000).toFixed(1)}s extraction · {meta.usage.inputTokens + meta.usage.outputTokens} tokens{meta.cached ? ' · reused extraction' : ''}</p>}
          </div>

          <aside className="source-column">
            <div className="section-heading source-title"><div><span className="step">03</span><h2>The source</h2></div><span className="source-tag">{custom ? 'YOUR TEXT' : 'EXAMPLE'}</span></div>
            <p className="muted small">{custom ? 'Paste the original description. No URL fetching or account access.' : 'Select a source reference to highlight the exact passage.'}</p>
            {custom && !facts ? <textarea className="listing-input" aria-label="Job description" maxLength={24000} value={text} disabled={busy} onChange={e => { setText(e.target.value); setSelected(null); }} placeholder="Paste a job description here…" /> : <pre className="source-text" ref={sourceRef} tabIndex={0}>{selected ? <>{text.slice(0,selected.start)}<mark>{text.slice(selected.start,selected.end)}</mark>{text.slice(selected.end)}</> : text}</pre>}
            {custom ? <div className="live-controls"><p className="field-note">{liveEnabled ? 'Live mode sends this text to your configured OpenAI model. Listings are cached in server memory for 15 minutes.' : 'Live mode needs OPENAI_API_KEY in the local server .env file. The examples work without one.'}</p><button className="primary-button" disabled={busy || text.trim().length < 30 || !liveEnabled} onClick={() => void run()}>{busy ? 'Analyzing…' : 'Analyze listing'}<Icon name="arrow" size={16} /></button>{facts && <button className="text-button" onClick={() => { setFacts(null); setMeta(null); setSelected(null); }}>Edit listing</button>}{error && <p className="error" role="alert">{error}</p>}</div> : <div className="source-disclaimer"><span className="status-dot unknown" /><p>{sample.source ? <>Public excerpt retrieved {sample.source.retrieved}. Facts are hand-authored, not live model output. This does not establish a product defect. <a href={sample.source.url} target="_blank" rel="noreferrer">Read the complete listing ↗</a></> : 'Fictional company and listing. Facts are hand-authored to demonstrate the comparison policy, not generated by a live model.'}</p></div>}
            <button className="add-listing" onClick={openCustom}><Icon name="plus" size={16} /> Analyze your own listing <Icon name="arrow" size={16} /></button>
          </aside>
        </div>
      </section>
      <section className="principles"><div><span>01 / TRACEABLE</span><h3>Every claim has a source.</h3><p>Exact quotations are checked against the listing before they support a conclusion.</p></div><div><span>02 / CONSERVATIVE</span><h3>Unknown is a useful answer.</h3><p>Missing information stays visible. It never quietly becomes an automatic rejection.</p></div><div><span>03 / REPRODUCIBLE</span><h3>The decisions are inspectable.</h3><p>Export the facts and explanation. Run the labelled policy cases from the repository.</p></div></section>
    </main>
    <footer><span>RoleProof <span className="footer-separator">/</span> Built by Suyash Bhattarai</span><span>Independent prototype. No Matcha affiliation.</span><a href="https://github.com/ItsM0rty/roleproof">View on GitHub <Icon name="arrow" size={14} /></a></footer>
  </>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
