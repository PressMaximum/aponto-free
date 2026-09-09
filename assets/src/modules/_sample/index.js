// Build-only proof that FREE module entries are discovered per module (D-R37). Unlike
// `pro/_sample`, its built output ships in BOTH editions — CI asserts
// assets/dist/free/modules/_sample.js and assets/dist/premium/modules/_sample.js both exist —
// because a free module's settings panel must reach the browser from the Free zip too.
export const APONTO_FREE_MODULE_SAMPLE_MARKER = 'aponto-free-module-sample-entry';
