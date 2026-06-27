"""
Replaces buildJupyterCSS() in main-layout.tsx with a full per-theme version.
Run from any Python 3 environment:
  python rebuild_theme.py
"""
import re, sys

PATH = r'C:\Users\Wissen\Documents\DataExploration\dep-ui-ux\components\layout\main-layout.tsx'

NEW_FUNC = r'''/**
 * Build the CSS block injected into the JupyterLite iframe.
 *
 * Each of the four DEP themes (dark / light / midnight / matrix) gets its own
 * full palette: backgrounds, foreground text, borders, syntax-highlight colours
 * that match the colour-scheme, icon CSS filter, and scrollbar colours.
 * The user's chosen accent colour is always slotted into brand / prompt vars.
 */
function buildJupyterCSS(): string {
  const s = typeof window !== 'undefined'
    ? getComputedStyle(document.documentElement)
    : null
  const get = (v: string, fb: string) =>
    s ? (s.getPropertyValue(v).trim() || fb) : fb

  const accent = get('--primary', '#007acc')
  const font   = get('--font-sans-custom', 'Inter')
  const a10    = hexToRgba(accent, 0.10)
  const a20    = hexToRgba(accent, 0.20)
  const a35    = hexToRgba(accent, 0.35)

  // Read the theme mode written by AccountSettings
  const themeMode = typeof window !== 'undefined'
    ? (localStorage.getItem('dep-theme-mode') || 'dark')
    : 'dark'

  type P = {
    bg0:string; bg1:string; bg2:string; bg3:string; bg4:string
    fg0:string; fg1:string; fg2:string
    border0:string; border1:string; dialogBg:string
    synKeyword:string; synString:string; synComment:string
    synNumber:string; synDef:string; synPunctuation:string
    synProperty:string; synOperator:string; synAtom:string; synBuiltin:string
    codeText:string; promptInactive:string; promptOut:string
    iconFilter:string
    scrollTrack:string; scrollThumb:string; scrollThumbHover:string
    colorScheme:'dark'|'light'
  }

  const PALETTES: Record<string, P> = {
    // ── Default Dark — VSCode charcoal ──────────────────────────────────────
    dark: {
      bg0:'#141414', bg1:'#1e1e1e', bg2:'#252526', bg3:'#2d2d2d', bg4:'#37373d',
      fg0:'#cccccc', fg1:'#9d9d9d', fg2:'#606060',
      border0:'#2b2b2b', border1:'#3c3c3c', dialogBg:'rgba(0,0,0,0.75)',
      synKeyword:'#569cd6', synString:'#ce9178', synComment:'#6a9955',
      synNumber:'#b5cea8', synDef:'#dcdcaa', synPunctuation:'#808080',
      synProperty:'#9cdcfe', synOperator:'#d4d4d4', synAtom:'#569cd6', synBuiltin:'#4ec9b0',
      codeText:'#d4d4d4', promptInactive:'#454545', promptOut:'#6a9955',
      iconFilter:'invert(1) brightness(2)',
      scrollTrack:'#141414', scrollThumb:'#3c3c3c', scrollThumbHover:'#555555',
      colorScheme:'dark',
    },
    // ── Light — Apple alabaster, dark ink on white ───────────────────────────
    light: {
      bg0:'#f5f5f7', bg1:'#eaeaea', bg2:'#ffffff', bg3:'#f0f0f0', bg4:'#e5e5ea',
      fg0:'#1d1d1f', fg1:'#494949', fg2:'#86868b',
      border0:'#d2d2d7', border1:'#c0c0c5', dialogBg:'rgba(0,0,0,0.45)',
      // VS Code Light / IntelliJ Light palette — high contrast on white
      synKeyword:'#0000ff', synString:'#a31515', synComment:'#008000',
      synNumber:'#098658', synDef:'#795e26', synPunctuation:'#555555',
      synProperty:'#001080', synOperator:'#222222', synAtom:'#0000ff', synBuiltin:'#267f99',
      codeText:'#1e1e1e', promptInactive:'#aaaaaa', promptOut:'#267f99',
      iconFilter:'none',   // lumino icons are dark by default — perfect on white
      scrollTrack:'#f0f0f0', scrollThumb:'#c0c0c5', scrollThumbHover:'#999999',
      colorScheme:'light',
    },
    // ── Midnight — deep navy ─────────────────────────────────────────────────
    midnight: {
      bg0:'#090c11', bg1:'#0f131a', bg2:'#131923', bg3:'#161c24', bg4:'#1e293b',
      fg0:'#b5c2d5', fg1:'#7e8f9f', fg2:'#4a5768',
      border0:'#1b2330', border1:'#253040', dialogBg:'rgba(0,0,0,0.80)',
      synKeyword:'#7eb8f7', synString:'#f0a080', synComment:'#5c7a5c',
      synNumber:'#9ecba0', synDef:'#e0d080', synPunctuation:'#708090',
      synProperty:'#80c8f8', synOperator:'#b5c2d5', synAtom:'#7eb8f7', synBuiltin:'#5fcfb0',
      codeText:'#c8d4e8', promptInactive:'#334455', promptOut:'#5c9a6a',
      iconFilter:'invert(1) brightness(1.8) sepia(0.2) hue-rotate(190deg)',
      scrollTrack:'#090c11', scrollThumb:'#253040', scrollThumbHover:'#3a4f6a',
      colorScheme:'dark',
    },
    // ── Matrix — phosphor green on black ─────────────────────────────────────
    matrix: {
      bg0:'#000000', bg1:'#050505', bg2:'#0a0a0a', bg3:'#0d0d0d', bg4:'#111800',
      fg0:'#00ff00', fg1:'#00cc00', fg2:'#006600',
      border0:'#003300', border1:'#004400', dialogBg:'rgba(0,20,0,0.90)',
      synKeyword:'#00ff88', synString:'#88ff44', synComment:'#336633',
      synNumber:'#44ff44', synDef:'#ccff00', synPunctuation:'#008800',
      synProperty:'#00ffcc', synOperator:'#00dd00', synAtom:'#00ff88', synBuiltin:'#00ffcc',
      codeText:'#00ee00', promptInactive:'#003300', promptOut:'#00aa44',
      iconFilter:'invert(1) sepia(1) saturate(10) hue-rotate(90deg) brightness(1.2)',
      scrollTrack:'#000000', scrollThumb:'#003300', scrollThumbHover:'#005500',
      colorScheme:'dark',
    },
  }

  const p = PALETTES[themeMode] ?? PALETTES.dark

  return `
/* DEP theme injection — ${themeMode} */
:root, body {
  color-scheme: ${p.colorScheme} !important;

  /* ── Layout backgrounds ── */
  --jp-layout-color0: ${p.bg0} !important;
  --jp-layout-color1: ${p.bg1} !important;
  --jp-layout-color2: ${p.bg2} !important;
  --jp-layout-color3: ${p.bg3} !important;
  --jp-layout-color4: ${p.bg4} !important;

  /* ── Foreground / body text ── */
  --jp-ui-font-color0: ${p.fg0} !important;
  --jp-ui-font-color1: ${p.fg0} !important;
  --jp-ui-font-color2: ${p.fg1} !important;
  --jp-ui-font-color3: ${p.fg2} !important;
  --jp-content-font-color0: ${p.fg0} !important;
  --jp-content-font-color1: ${p.fg0} !important;
  --jp-content-font-color2: ${p.fg1} !important;
  --jp-content-font-color3: ${p.fg2} !important;

  /* ── Borders ── */
  --jp-border-color0: ${p.border0} !important;
  --jp-border-color1: ${p.border1} !important;
  --jp-border-color2: ${p.border1} !important;
  --jp-border-color3: ${p.border1} !important;

  /* ── Brand / accent ── */
  --jp-brand-color0: ${accent} !important;
  --jp-brand-color1: ${accent} !important;
  --jp-brand-color2: ${a35} !important;
  --jp-brand-color3: ${a20} !important;
  --jp-brand-color4: ${a10} !important;
  --jp-accent-color0: ${accent} !important;
  --jp-accent-color1: ${accent} !important;
  --jp-accent-color2: ${a35} !important;
  --jp-accent-color3: ${a10} !important;

  /* ── Typography ── */
  --jp-ui-font-family: '${font}','Inter','Segoe UI',system-ui,sans-serif !important;
  --jp-content-font-family: '${font}','Inter','Segoe UI',system-ui,sans-serif !important;
  --jp-ui-font-size0: 11px !important;
  --jp-ui-font-size1: 13px !important;
  --jp-ui-font-size2: 15px !important;
  --jp-code-font-family: 'JetBrains Mono','Fira Code','Cascadia Code',Consolas,monospace !important;
  --jp-code-font-size: 13px !important;
  --jp-code-line-height: 1.6 !important;

  /* ── Cell prompts ── */
  --jp-cell-prompt-not-active-font-color: ${p.promptInactive} !important;
  --jp-cell-prompt-not-active-opacity: 1 !important;
  --jp-cell-inprompt-font-color: ${accent} !important;
  --jp-cell-outprompt-font-color: ${p.promptOut} !important;

  /* ── Editor selections ── */
  --jp-editor-selected-background: ${a10} !important;
  --jp-editor-selected-focused-background: ${a20} !important;
  --jp-cell-editor-background: ${p.bg2} !important;
  --jp-cell-editor-border-color: ${p.border1} !important;
  --jp-cell-editor-active-background: ${p.bg2} !important;
  --jp-cell-editor-active-border-color: ${accent} !important;

  /* ── Syntax highlighting (per-theme) ── */
  --jp-mirror-editor-keyword-color:     ${p.synKeyword}     !important;
  --jp-mirror-editor-string-color:      ${p.synString}      !important;
  --jp-mirror-editor-comment-color:     ${p.synComment}     !important;
  --jp-mirror-editor-number-color:      ${p.synNumber}      !important;
  --jp-mirror-editor-def-color:         ${p.synDef}         !important;
  --jp-mirror-editor-punctuation-color: ${p.synPunctuation} !important;
  --jp-mirror-editor-property-color:    ${p.synProperty}    !important;
  --jp-mirror-editor-operator-color:    ${p.synOperator}    !important;
  --jp-mirror-editor-atom-color:        ${p.synAtom}        !important;
  --jp-mirror-editor-meta-color:        ${accent}           !important;
  --jp-mirror-editor-builtin-color:     ${p.synBuiltin}     !important;
  --jp-mirror-editor-variable-color:    ${p.fg0}            !important;
  --jp-mirror-editor-variable-2-color:  ${p.synProperty}    !important;
  --jp-mirror-editor-variable-3-color:  ${p.synBuiltin}     !important;
  --jp-mirror-editor-bracket-color:     ${p.synPunctuation} !important;
  --jp-mirror-editor-tag-color:         ${p.synKeyword}     !important;
  --jp-mirror-editor-attribute-color:   ${p.synProperty}    !important;
  --jp-mirror-editor-header-color:      ${accent}           !important;
  --jp-mirror-editor-quote-color:       ${p.synComment}     !important;
  --jp-mirror-editor-link-color:        ${accent}           !important;
  --jp-mirror-editor-error-color:       #f44747            !important;
  --jp-mirror-editor-hr-color:          ${p.border1}        !important;

  /* ── Toolbar / menus / sidebar ── */
  --jp-toolbar-background: ${p.bg1} !important;
  --jp-toolbar-border-color: ${p.border0} !important;
  --jp-toolbar-box-shadow: none !important;
  --jp-menubar-background: ${p.bg0} !important;
  --jp-sidebar-background: ${p.bg0} !important;

  /* ── Inputs ── */
  --jp-input-background: ${p.bg3} !important;
  --jp-input-border-color: ${p.border1} !important;
  --jp-input-active-background: ${p.bg2} !important;
  --jp-input-hover-background: ${p.bg4} !important;
  --jp-input-active-box-shadow-color: ${a35} !important;

  /* ── Dialogs / overlays ── */
  --jp-dialog-background: ${p.dialogBg} !important;

  /* ── Output areas ── */
  --jp-cell-stdout-background: ${p.bg1} !important;
  --jp-cell-stderr-background: rgba(244,71,71,0.08) !important;

  /* ── Search highlights ── */
  --jp-search-selected-match-background-color: ${a35} !important;
  --jp-search-unselected-match-background-color: ${a10} !important;
}

/* ── Code editor text & cursor ── */
.cm-editor, .cm-content, .CodeMirror, .CodeMirror-code {
  color: ${p.codeText} !important;
  background-color: ${p.bg2} !important;
}
.CodeMirror-cursor { border-left-color: ${p.fg0} !important; }
.CodeMirror-selected, .cm-selectionBackground { background: ${a20} !important; }

/* ── Cells ── */
.jp-Cell { background: ${p.bg1} !important; }
.jp-Cell .jp-InputArea { background: ${p.bg2} !important; }
.jp-Cell.jp-mod-active  .jp-InputArea,
.jp-Cell.jp-mod-selected .jp-InputArea {
  border-left: 2px solid ${accent} !important;
  background: ${p.bg2} !important;
}
.jp-Cell.jp-mod-active { background: ${p.bg1} !important; }

/* ── Output ── */
.jp-OutputArea-output { background: ${p.bg0} !important; color: ${p.fg0} !important; }
.jp-OutputArea-output pre, .jp-OutputArea-output p { color: ${p.fg0} !important; }

/* ── Menu bar ── */
.jp-MenuBar { background: ${p.bg0} !important; }
.jp-MenuBar-item { color: ${p.fg1} !important; }
.jp-MenuBar-item:hover, .jp-MenuBar-item.p-mod-active {
  background: ${a20} !important; color: ${p.fg0} !important;
}
.p-Menu { background: ${p.bg1} !important; border: 1px solid ${p.border1} !important; }
.p-Menu-item { color: ${p.fg0} !important; }
.p-Menu-item:hover, .p-Menu-item.p-mod-active { background: ${a20} !important; }
.p-Menu-itemLabel { color: ${p.fg0} !important; }
.p-Menu-itemShortcut { color: ${p.fg2} !important; }

/* ── Toolbar ── */
.jp-Toolbar {
  background: ${p.bg1} !important;
  border-bottom: 1px solid ${p.border0} !important;
}
.jp-ToolbarButtonComponent {
  color: ${p.fg1} !important;
  background: transparent !important;
}
.jp-ToolbarButtonComponent:hover {
  background: ${a10} !important;
  color: ${p.fg0} !important;
}

/* ── SVG icon colour via CSS filter ──
   dark/midnight/matrix: invert black icons → white/tinted
   light: no filter — lumino icons are already dark on white              */
.jp-ToolbarButtonComponent svg,
.jp-MenuBar svg,
.jp-SideBar svg,
.jp-FileBrowser svg,
.jp-Button svg {
  filter: ${p.iconFilter} !important;
}
.jp-icon-accent0 [fill] { fill: ${accent} !important; }
.jp-icon-warn0  [fill]  { fill: #ce9178 !important; }

/* ── Sidebar / file browser ── */
.jp-SideBar {
  background: ${p.bg0} !important;
  border-right: 1px solid ${p.border0} !important;
}
.jp-FileBrowser { background: ${p.bg0} !important; color: ${p.fg0} !important; }
.jp-DirListing-item { color: ${p.fg0} !important; }
.jp-DirListing-item:hover { background: ${a10} !important; }
.jp-DirListing-item.jp-mod-selected { background: ${a20} !important; color: ${p.fg0} !important; }

/* ── Tab bar ── */
.lm-TabBar { background: ${p.bg0} !important; border-bottom: 1px solid ${p.border0} !important; }
.lm-TabBar-tab {
  background: ${p.bg1} !important;
  color: ${p.fg2} !important;
  border-color: ${p.border0} !important;
}
.lm-TabBar-tab.lm-mod-current {
  background: ${p.bg2} !important;
  color: ${p.fg0} !important;
  border-bottom-color: ${p.bg2} !important;
}
.lm-TabBar-tab:hover { color: ${p.fg0} !important; }

/* ── Scrollbars ── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: ${p.scrollTrack}; }
::-webkit-scrollbar-thumb { background: ${p.scrollThumb}; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: ${p.scrollThumbHover}; }

/* ── Links & buttons ── */
a { color: ${accent} !important; }
.jp-Button.jp-mod-styled.jp-mod-accept {
  background: ${accent} !important; color: #fff !important;
}
.jp-Button.jp-mod-styled:not(.jp-mod-accept) {
  background: ${p.bg3} !important;
  color: ${p.fg0} !important;
  border-color: ${p.border1} !important;
}

/* ── Remove JupyterLab logo ── */
#jp-MainLogo { display: none !important; }
`
}
'''

with open(PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# Identify the JSDoc comment start
start_marker = '/**\n * Build the <style> block'
# Identify end: just before 'interface MainLayoutProps {'
end_marker   = '\n\ninterface MainLayoutProps {'

start_idx = content.index(start_marker)
end_idx   = content.index(end_marker)

new_content = content[:start_idx] + NEW_FUNC + content[end_idx:]

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Done. Replaced {end_idx - start_idx} chars with {len(NEW_FUNC)} chars. New file: {len(new_content)} chars.")
