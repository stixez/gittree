import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { createElement } from 'react'
import { detectLanguage } from './CodeViewer'

const countColorSpans = (html: string) =>
  (html.match(/style="[^"]*color:/g) || []).length

describe('detectLanguage', () => {
  it('maps common extensions to correct highlight.js language ids', () => {
    expect(detectLanguage('a.ts')).toBe('typescript')
    expect(detectLanguage('a.tsx')).toBe('typescript')
    expect(detectLanguage('a.py')).toBe('python')
    // Previously broken / missing:
    expect(detectLanguage('Main.kt')).toBe('kotlin')
    expect(detectLanguage('a.rb')).toBe('ruby')
    expect(detectLanguage('a.php')).toBe('php')
    expect(detectLanguage('a.swift')).toBe('swift')
    expect(detectLanguage('a.cs')).toBe('csharp')
    expect(detectLanguage('Dockerfile')).toBe('dockerfile')
    expect(detectLanguage('a.toml')).toBe('toml')
  })

  it('falls back to plaintext for unknown extensions', () => {
    expect(detectLanguage('a.unknownext')).toBe('plaintext')
  })
})

describe('full highlight.js build renders colors for previously-plain languages', () => {
  const samples: Array<[string, string]> = [
    ['kotlin', 'fun main() { val x: Int = 42 }'],
    ['ruby', 'def greet(name)\n  "hi #{name}"\nend'],
    ['php', '<?php function f($a) { return $a + 1; }'],
    ['csharp', 'public class A { int X => 42; }'],
  ]

  for (const [language, code] of samples) {
    it(`${language} produces colored token spans`, () => {
      const html = renderToStaticMarkup(
        createElement(SyntaxHighlighter as any, { language, style: atomOneDark }, code)
      )
      expect(countColorSpans(html)).toBeGreaterThan(1)
    })
  }
})
