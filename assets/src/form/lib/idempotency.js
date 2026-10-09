/**
 * Idempotency key lifecycle — SPEC-P0 §5.6 / rest-contract §3.4 / SPEC-P1 §2.2.
 *
 * Rules the client must honour:
 *  1. A canonical v4 UUID is created when the visitor enters the step that owns
 *     the final Book CTA (Details in V1).
 *  2. The SAME key is reused across every safe retry (409 slot-taken, 425, 429,
 *     503, network) so the server can replay the already-committed booking.
 *  3. The key is regenerated the instant the booking draft changes — going back
 *     to pick a different slot, or editing any field the server fingerprints —
 *     so a fresh request never collides as `aponto_idempotency_conflict`.
 *
 * We tie the key to a fingerprint of the exact fields the server hashes
 * (`RequestFingerprint::forBooking`): change any of them and the key rotates;
 * keep them identical and the key is stable across retries. The header must
 * satisfy `wp_is_uuid()` (RFC-4122 v4), which both `crypto.randomUUID()` and the
 * fallback below produce.
 *
 * Pure module: no Preact, no DOM. Unit-testable.
 */

/**
 * Generate a canonical RFC-4122 v4 UUID that `wp_is_uuid()` accepts.
 *
 * @return {string} UUID.
 */
export function generateUuid() {
	try {
		if (
			typeof crypto !== 'undefined' &&
			typeof crypto.randomUUID === 'function'
		) {
			return crypto.randomUUID();
		}
	} catch {
		// fall through to manual construction
	}

	const bytes = new Uint8Array( 16 );
	if ( typeof crypto !== 'undefined' && crypto.getRandomValues ) {
		crypto.getRandomValues( bytes );
	} else {
		for ( let i = 0; i < 16; i++ ) {
			bytes[ i ] = Math.floor( Math.random() * 256 );
		}
	}
	// Version 4 + RFC-4122 variant bits (bitwise is required by the UUID spec).
	/* eslint-disable no-bitwise */
	bytes[ 6 ] = ( bytes[ 6 ] & 0x0f ) | 0x40;
	bytes[ 8 ] = ( bytes[ 8 ] & 0x3f ) | 0x80;
	/* eslint-enable no-bitwise */
	const hex = [];
	for ( let i = 0; i < 256; i++ ) {
		hex.push( ( i + 0x100 ).toString( 16 ).slice( 1 ) );
	}
	return (
		hex[ bytes[ 0 ] ] +
		hex[ bytes[ 1 ] ] +
		hex[ bytes[ 2 ] ] +
		hex[ bytes[ 3 ] ] +
		'-' +
		hex[ bytes[ 4 ] ] +
		hex[ bytes[ 5 ] ] +
		'-' +
		hex[ bytes[ 6 ] ] +
		hex[ bytes[ 7 ] ] +
		'-' +
		hex[ bytes[ 8 ] ] +
		hex[ bytes[ 9 ] ] +
		'-' +
		hex[ bytes[ 10 ] ] +
		hex[ bytes[ 11 ] ] +
		hex[ bytes[ 12 ] ] +
		hex[ bytes[ 13 ] ] +
		hex[ bytes[ 14 ] ] +
		hex[ bytes[ 15 ] ]
	);
}

/**
 * A stable fingerprint of the fields the server hashes for idempotency. Any
 * change rotates the key; identical drafts share a key across retries. Email is
 * normalised (lowercase + trim) to mirror the server's `email_norm`.
 *
 * LOCKSTEP with `RequestFingerprint::forBooking()` (D-R30). The two encodings
 * differ on purpose — hashing here would mean shipping SHA-256 into a 60 KB
 * budget — but the FIELD SET must match: a field the server hashes and this
 * function ignores is a field the visitor can edit without rotating the key,
 * and the next retry comes back `409 aponto_idempotency_conflict` on a booking
 * they legitimately changed. `tests/fixtures/idempotency-lockstep.json` drives
 * one Jest test and one PHPUnit test over the same drafts so the two field sets
 * cannot silently drift apart.
 *
 * The customer name is fingerprinted as its two parts, `first_name` and
 * `last_name` (name split, D-R69), exactly as the server hashes them.
 *
 * `custom_fields` is included only when the draft carries answers, matching the
 * server, so a site collecting none fingerprints exactly as it did before.
 * `payment_method` follows the same rule (D-R38): a site that takes no online
 * payment fingerprints byte-identically to the pre-payment build, and switching
 * between "pay now" and "pay on site" rotates the key — which it must, because
 * that is a different booking request, not a retry of the same one.
 *
 * `location_id` (D-R62) is the value the widget SENDS, and it joins only when non-null. The
 * server hashes the CLIENT-SENT `location_id ?? 0` — never the id it resolved (rest-contract §3.3
 * addendum 2026-09-23) — so the two sides agree exactly: a null here is `0` there, which is the
 * hash every site produced before D-R61, and changing branch changes both. Without this field a
 * branch change would keep the key and the retry would come back `409
 * aponto_idempotency_conflict`. Hashing the sent value rather than the resolved one is also what
 * lets a retry REPLAY after the server's own assignment moved (a branch archived between the two
 * attempts) instead of colliding.
 *
 * @param {Object} draft Booking draft.
 * @return {string} Fingerprint.
 */
export function draftFingerprint( draft ) {
	const d = draft || {};
	const c = d.customer || {};
	const canonical = {
		service_id: d.service_id ?? null,
		staff_id: d.staff_id ?? null,
		start_utc: d.start_utc ?? null,
		tz: d.tz ?? null,
		// The two stored parts replace the pre-split `name` (founder 2026-10-01,
		// D-R69): moving a word between them is a different booking request.
		first_name: ( c.first_name || '' ).trim(),
		last_name: ( c.last_name || '' ).trim(),
		email: ( c.email || '' ).trim().toLowerCase(),
		phone: ( c.phone || '' ).trim(),
		note: c.note || '',
		consent: !! d.consent,
	};
	if ( d.location_id ) {
		canonical.location_id = d.location_id;
	}
	if ( d.payment_method ) {
		canonical.payment_method = d.payment_method;
	}
	if ( d.payment_amount_mode === 'full' ) {
		canonical.payment_amount_mode = 'full';
	}
	if ( d.coupon_code ) {
		canonical.coupon_code = d.coupon_code;
	}
	const custom = d.custom_fields || {};
	const slugs = Object.keys( custom ).sort();
	if ( slugs.length ) {
		const sorted = {};
		slugs.forEach( ( slug ) => {
			sorted[ slug ] = custom[ slug ];
		} );
		canonical.custom_fields = sorted;
	}
	return JSON.stringify( canonical );
}

/**
 * Create an idempotency-key manager.
 *
 * @return {{keyFor:(draft:Object)=>string, current:()=>?string, reset:()=>void}} Manager.
 */
export function createIdempotencyManager() {
	let key = null;
	let fingerprint = null;

	return {
		/**
		 * Return the key for a draft, rotating it when the draft changed.
		 *
		 * @param {Object} draft Booking draft.
		 * @return {string} Idempotency key.
		 */
		keyFor( draft ) {
			const fp = draftFingerprint( draft );
			if ( ! key || fp !== fingerprint ) {
				key = generateUuid();
				fingerprint = fp;
			}
			return key;
		},

		/** @return {?string} The current key without rotating. */
		current() {
			return key;
		},

		/** Clear the key (after a committed booking / "book another"). */
		reset() {
			key = null;
			fingerprint = null;
		},
	};
}
