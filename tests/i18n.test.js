import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dictionaries, t, tf, detectLang, isLang, LANGS } from '../src/i18n.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('en and zh dictionaries have exactly the same keys', () => {
  const enKeys = Object.keys(dictionaries.en).sort();
  const zhKeys = Object.keys(dictionaries.zh).sort();
  assert.deepEqual(zhKeys, enKeys);
});

test('every dictionary value is a non-empty string', () => {
  for (const lang of LANGS) {
    for (const [key, value] of Object.entries(dictionaries[lang])) {
      assert.equal(typeof value, 'string', `${lang}.${key}`);
      assert.ok(value.length > 0, `${lang}.${key} is empty`);
    }
  }
});

test('no Chinese characters leak outside the zh dictionary', () => {
  for (const [key, value] of Object.entries(dictionaries.en)) {
    assert.ok(!/[\u4e00-\u9fff]/.test(value), `en.${key} contains Chinese text`);
  }
});

test('all data-i18n keys used in index.html exist in both dictionaries', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const keys = [...html.matchAll(/data-i18n(?:-placeholder|-title)?="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length > 5, 'expected several static i18n keys');
  for (const key of keys) {
    for (const lang of LANGS) {
      assert.ok(dictionaries[lang][key], `missing ${lang}.${key}`);
    }
  }
});

test('every t() key referenced by the UI modules exists', () => {
  const files = ['src/main.js', 'src/ui/controls.js', 'src/ui/timetable.js', 'src/ui/stats.js', 'src/ui/graphview.js'];
  const staticKeys = new Set();
  for (const file of files) {
    const source = readFileSync(join(ROOT, file), 'utf8');
    for (const m of source.matchAll(/\bt\('([^']+)'/g)) staticKeys.add(m[1]);
  }
  for (const key of staticKeys) {
    assert.ok(dictionaries.en[key], `missing en.${key}`);
    assert.ok(dictionaries.zh[key], `missing zh.${key}`);
  }
});

test('detectLang honours URL, storage and browser preference in that order', () => {
  assert.equal(detectLang('?lang=en', 'zh', 'zh-CN'), 'en');
  assert.equal(detectLang('', 'zh', 'en-US'), 'zh');
  assert.equal(detectLang('', null, 'zh-CN'), 'zh');
  assert.equal(detectLang('', null, 'fr-FR'), 'en');
  assert.equal(isLang('de'), null);
});

test('t falls back to English and tf interpolates placeholders', () => {
  assert.notEqual(t('appTitle', 'zh'), t('appTitle', 'en'));
  assert.ok(t('appTitle', 'zh').length > 0);
  assert.equal(t('missing.key', 'zh'), 'missing.key');
  assert.equal(tf('savingsMore', 'en', { n: 3 }), 'Highest-conflict-first saves 3 slot(s) versus course order.');
  const zhImport = tf('ok.imported', 'zh', { s: 8, t: 24 });
  assert.ok(zhImport.includes('8') && zhImport.includes('24'));
  assert.notEqual(zhImport, tf('ok.imported', 'en', { s: 8, t: 24 }));
});
