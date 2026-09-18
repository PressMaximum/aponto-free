# Translation catalog

- `aponto.pot` — full translation template, generated with `wp i18n make-pot` (do not hand-edit).
- `aponto-vi.po` / `aponto-vi.mo` — Vietnamese translation. The public booking form, the
  manage/cancel page, the notification editor, the onboarding wizard and common admin strings are
  translated; the remaining admin strings fall back to English.
- `aponto-vi-<handle>.json` — script translations for the JS bundles (`aponto-booking-form-view`,
  `aponto-booking-form-editor`, `aponto-wizard`, `aponto-admin`, plus one `aponto-module-{code}`
  per module settings panel that has translated strings). They are named by script handle
  because `wp_set_script_translations( $handle, 'aponto', <this dir> )` resolves the handle-named
  file first — the reliable mapping for a bundled (webpack) build, where `wp i18n make-json`'s
  source-path md5 filenames do not match the built script handles.

## Regenerate

Step 1 runs in wp-env; steps 2–4 run on the HOST from the plugin root. Steps 2 and 3 need GNU
gettext (`msgmerge`, `msgfmt`), which the wp-env cli image does NOT ship — it is Alpine with no
gettext at all. On macOS: `brew install gettext`.

```sh
# 1. Template from PHP + JS sources. Keep `dist` in --exclude: a staged/built `dist/aponto/`
#    tree is a byte copy of src/, so leaving it in duplicates every reference as
#    `#: dist/aponto/…` and makes the template diff useless.
npx wp-env run cli wp i18n make-pot wp-content/plugins/aponto wp-content/plugins/aponto/languages/aponto.pot \
  --domain=aponto \
  --exclude=node_modules,vendor,build,dist,assets/dist,docs,spikes,unpacked,tests,.claude,scripts,artifacts

# 2. Merge the new template into the existing translation. --no-fuzzy-matching is mandatory:
#    fuzzy matches silently attach an old translation to a changed msgid, which ships wrong
#    copy. New strings must arrive untranslated and be translated deliberately.
msgmerge --no-fuzzy-matching --update --backup=none languages/aponto-vi.po languages/aponto.pot

# 3. After editing aponto-vi.po, compile the .mo. Use msgfmt, NOT `wp i18n make-mo`: make-mo
#    rewrites the file, flattening a translated plural to a singular msgstr and churning
#    the header. msgfmt is what produced the committed aponto-vi.mo — verified byte-identical.
msgfmt -o languages/aponto-vi.mo languages/aponto-vi.po

# 4. … and regenerate the handle-named script-translation JSON (deterministic —
#    output derives entirely from the .po, safe to diff). Module panel handles are
#    AUTO-DISCOVERED from both entry shapes — `assets/src/pro/{code}` (premium) and
#    `assets/src/modules/{code}` (free, D-R37) — so a new panel needs no edit to the script;
#    a module with no translated strings in the .po simply emits no file.
npm run i18n:json     # = python3 scripts/i18n/make-script-json.py languages/aponto-vi.po languages
```
