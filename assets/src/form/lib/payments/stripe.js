/**
 * Stripe adapter — Payment Element, DEFERRED intent, slot-projected mount.
 *
 * Every rule below is something the spike measured rather than something the
 * integration guide says (`docs/research/spike-payments-inline-results.md`):
 *
 *  1. **Mount in the light DOM.** `element.mount(nodeInsideShadowRoot)` does not
 *     throw for the Payment Element — it just never becomes ready, forever, with
 *     no `loaderror` and nothing in the console. The holder is therefore a child
 *     of the widget HOST, projected back in through `<slot name="ap-stripe">`.
 *  2. **Time the `ready` event out.** Because that failure is silent, "no error"
 *     is not evidence of success. Twenty seconds, then tear down, tell the
 *     customer, and warn once (no PII) so a site owner has something to grep for.
 *  3. **Resolve the tokens.** Handing Stripe a raw `color-mix(...)` string is
 *     accepted and silently ignored — the element renders un-themed with nothing
 *     to debug. Every value goes through a probe inside `.ap-wrap` first.
 *  4. **Never re-parent the holder.** Moving an iframe in the DOM reloads it, and
 *     a reloaded Payment Element loses whatever the customer had typed. Panels
 *     are hidden by toggling `holder.hidden`, never by moving the node.
 *
 * The amount handed to `elements()` is for DISPLAY and client-side validation
 * only. What the customer is actually charged comes from the order row on the
 * server (D-R38c); this number can be wrong without being dangerous, and the
 * server rejects any disagreement.
 */

import {
	createHolder,
	resolveToken,
	computedFontFamily,
	slotName,
} from './host.js';

/** Stripe.js, from Stripe's CDN. Never bundled, never self-hosted (their terms). */
const SDK_URL = 'https://js.stripe.com/v3/';

/** How long to wait for the Payment Element's `ready` before giving up. */
const READY_TIMEOUT_MS = 20000;

/** Telemetry marker for the silent-hang case. Carries no PII by construction. */
const TIMEOUT_MARKER = 'aponto:payment_ui_timeout';

/** Telemetry marker for an amount this gateway cannot be handed. */
const AMOUNT_MARKER = 'aponto:payment_amount_unsupported';

/**
 * An integer, or null for anything that is not unambiguously one.
 *
 * `Number()` alone is not usable here: it maps `null` and `''` to `0`, which
 * would turn a MISSING exponent into a claim that the currency is zero-decimal —
 * i.e. into a hundredfold error, silently. Absence has to stay absent.
 *
 * @param {*} value Raw value (the boot payload sends exponents as strings).
 * @return {?number} Integer or null.
 */
function intOrNull( value ) {
	if ( typeof value === 'number' ) {
		return Number.isInteger( value ) ? value : null;
	}
	if ( typeof value === 'string' && /^-?\d+$/.test( value.trim() ) ) {
		return parseInt( value.trim(), 10 );
	}
	return null;
}

/**
 * An order total in Aponto's minor units → Stripe's own smallest unit.
 *
 * NOT `/100`, and not a formatting detail. Aponto stores ISO-4217 minor units;
 * Stripe takes "the smallest currency unit" as ITS table defines it, and the two
 * tables disagree in both directions — ISK is zero-decimal to ISO and TWO-decimal
 * to Stripe (×100), MGA is two-decimal to ISO and ZERO-decimal to Stripe (÷100).
 * Passing our number through would show the customer one hundredth or one hundred
 * times the price on the Element, i.e. a figure nobody agreed to.
 *
 * The server owns both halves — `payments.currency_exponent` is ours,
 * `client.gateway_exponent` is Stripe's — and this is only their difference. It
 * mirrors `Aponto\Payments\Stripe\Money::toStripe()` exactly, including its
 * refusal to round: an amount that does not divide is REFUSED, never truncated,
 * because a rounded charge is worse than a payment method that will not open.
 *
 * @param {number} minor            Order total in Aponto minor units.
 * @param {*}      gatewayExponent  Stripe's exponent for this currency.
 * @param {*}      currencyExponent The site currency's ISO exponent.
 * @return {?number} The gateway amount, or null when it cannot be expressed.
 */
export function toGatewayAmount( minor, gatewayExponent, currencyExponent ) {
	const amount = intOrNull( minor );
	const theirs = intOrNull( gatewayExponent );
	const ours = intOrNull( currencyExponent );
	if ( amount === null || amount <= 0 || theirs === null || ours === null ) {
		return null;
	}
	if ( theirs >= ours ) {
		return amount * Math.pow( 10, theirs - ours );
	}
	const divisor = Math.pow( 10, ours - theirs );
	// Our unit is FINER than the gateway's (MGA): exact division or nothing.
	return amount % divisor === 0 ? amount / divisor : null;
}

/**
 * Load Stripe.js once per page and resolve with the `Stripe` constructor.
 *
 * An already-present `window.Stripe` is reused verbatim: another plugin may have
 * loaded it, and the e2e harness substitutes a stub the same way. The in-flight
 * promise is cached on the window rather than in a module variable so two widgets
 * on one page share a single script tag.
 *
 * @param {Document} doc Document to load into.
 * @return {Promise<Function>} The `Stripe` constructor.
 */
export function loadStripeSdk( doc ) {
	const d = doc || document;
	const win = d.defaultView || window;
	if ( typeof win.Stripe === 'function' ) {
		return Promise.resolve( win.Stripe );
	}
	if ( win.__apontoStripeLoader ) {
		return win.__apontoStripeLoader;
	}

	win.__apontoStripeLoader = new Promise( ( resolve, reject ) => {
		let script = d.querySelector( 'script[src="' + SDK_URL + '"]' );
		const fail = () => {
			// Let a later attempt retry rather than caching the failure forever:
			// the customer may simply have lost the network for a moment. The TAG
			// has to go with the cached promise — a script element that already
			// errored never fires `load` again, so leaving it behind would make
			// every retry hang on a corpse instead of re-fetching.
			win.__apontoStripeLoader = null;
			if ( script && script.parentNode ) {
				script.remove();
			}
			script = null;
			reject( new Error( 'stripe-sdk-unavailable' ) );
		};
		const done = () => {
			if ( typeof win.Stripe === 'function' ) {
				resolve( win.Stripe );
			} else {
				fail();
			}
		};
		if ( ! script ) {
			script = d.createElement( 'script' );
			script.src = SDK_URL;
			script.async = true;
			( d.head || d.body || d.documentElement ).appendChild( script );
		}
		script.addEventListener( 'load', done );
		script.addEventListener( 'error', fail );
	} );

	return win.__apontoStripeLoader;
}

/**
 * The `appearance` object, built from the widget's own resolved tokens so the
 * card fields look like the rest of the form on any theme.
 *
 * Only non-empty values are included: an empty string is not a colour, and
 * passing one asks Stripe to fail on something the site owner never set.
 *
 * @param {HTMLElement} scope `.ap-wrap`.
 * @return {Object} Stripe appearance object.
 */
export function resolveAppearance( scope ) {
	const accent = resolveToken( scope, '--ap-color-accent', 'color' );
	const text = resolveToken( scope, '--ap-color-text', 'color' );
	const muted = resolveToken( scope, '--ap-color-text-muted', 'color' );
	const danger = resolveToken( scope, '--ap-color-danger', 'color' );
	const surface = resolveToken( scope, '--ap-color-surface', 'color' );
	const border = resolveToken( scope, '--ap-color-border', 'color' );
	const radius = resolveToken(
		scope,
		'--ap-radius-control',
		'border-top-left-radius'
	);
	const fontSize = resolveToken( scope, '--ap-font-size-body', 'font-size' );
	const fontFamily = computedFontFamily( scope );

	const variables = {};
	const put = ( key, value ) => {
		if ( value ) {
			variables[ key ] = value;
		}
	};
	put( 'colorPrimary', accent );
	put( 'colorText', text );
	put( 'colorTextSecondary', muted );
	put( 'colorDanger', danger );
	put( 'colorBackground', surface );
	put( 'borderRadius', radius );
	put( 'fontSizeBase', fontSize );
	put( 'fontFamily', fontFamily );

	const rules = {};
	if ( border ) {
		rules[ '.Input' ] = {
			border: '1px solid ' + border,
			boxShadow: 'none',
		};
		rules[ '.Tab' ] = { border: '1px solid ' + border, boxShadow: 'none' };
	}
	if ( accent ) {
		rules[ '.Input:focus' ] = { borderColor: accent, boxShadow: 'none' };
		rules[ '.Tab--selected' ] = { borderColor: accent, boxShadow: 'none' };
	}
	if ( danger ) {
		rules[ '.Input--invalid' ] = { borderColor: danger };
	}
	if ( muted ) {
		rules[ '.Label' ] = { color: muted };
	}

	return { variables, rules };
}

/**
 * Whether a Stripe error's own text may be shown to the customer.
 *
 * Stripe writes `card_error` and `validation_error` messages FOR the cardholder
 * ("Your card was declined."). Everything else — `api_error`,
 * `invalid_request_error` — is written for the integrator and can name internal
 * details, so those get our generic copy instead.
 *
 * @param {Object} error Stripe error object.
 * @return {string} A customer-safe message, or '' to use the widget's own copy.
 */
export function customerSafeMessage( error ) {
	const type = error && error.type ? String( error.type ) : '';
	if (
		( type === 'card_error' || type === 'validation_error' ) &&
		error.message
	) {
		return String( error.message );
	}
	return '';
}

/**
 * Create the Stripe adapter for one offered gateway.
 *
 * @param {Object} gateway `{code, label, client:{publishable_key, mode}}`.
 * @return {Object} Adapter.
 */
export function createStripeAdapter( gateway ) {
	const client = ( gateway && gateway.client ) || {};
	const slot = slotName( ( gateway || {} ).code );

	let sdk = null;
	let elements = null;
	let element = null;
	let holder = null;
	let complete = false;
	let torn = false;
	let pendingPatch = null;

	/** Tear the gateway UI down, in the order the spike requires. */
	function teardown() {
		if ( element ) {
			try {
				element.destroy();
			} catch {
				// Already gone — the holder still has to go.
			}
		}
		element = null;
		elements = null;
		pendingPatch = null;
		sdk = null;
		complete = false;
		if ( holder ) {
			holder.remove();
			holder = null;
		}
	}

	return {
		code: ( gateway || {} ).code,
		slot,

		/** @return {boolean} Whether the element reports a complete input. */
		isComplete() {
			return complete;
		},

		/**
		 * Create the light-DOM holder, mount the Payment Element into it and
		 * resolve once the element reports itself ready.
		 *
		 * @param {Object}      opts                Mount options.
		 * @param {HTMLElement} opts.host           Widget host (`[data-aponto-form]`).
		 * @param {HTMLElement} opts.scope          Token scope (`.ap-wrap`).
		 * @param {number}      opts.amount         Order total in minor units.
		 * @param {string}      opts.currency       ISO-4217 code.
		 * @param {Function}    [opts.onChange]     Called with the completeness flag.
		 * @param {number}      [opts.readyTimeout] Override the 20s ready budget.
		 * @return {Promise<void>} Resolves when the element is ready.
		 */
		async mount( opts ) {
			const {
				host,
				scope,
				amountMinor,
				currency,
				currencyExponent,
				onChange,
				readyTimeout = READY_TIMEOUT_MS,
			} = opts;
			torn = false;

			// Refuse BEFORE anything is created: a currency this gateway cannot
			// express, or an amount that would have to be rounded, must not reach
			// an Element that would then quote the wrong figure.
			const amount = toGatewayAmount(
				amountMinor,
				client.gateway_exponent,
				currencyExponent
			);
			if ( amount === null ) {
				/* eslint-disable-next-line no-console */
				console.warn( AMOUNT_MARKER );
				throw new Error( 'payment-amount-unsupported' );
			}

			const Stripe = await loadStripeSdk( host.ownerDocument );
			if ( torn ) {
				return;
			}

			sdk = Stripe( client.publishable_key );
			holder = createHolder( host, slot );

			elements = sdk.elements( {
				mode: 'payment',
				amount,
				currency: String( currency || '' ).toLowerCase(),
				appearance: resolveAppearance( scope ),
				locale: 'auto',
			} );
			// Selection can change while Stripe.js is loading. Apply its latest amount
			// before mounting the payment UI, so ready never exposes the old choice.
			if ( pendingPatch ) {
				const patch = pendingPatch;
				pendingPatch = null;
				this.update( patch );
			}
			element = elements.create( 'payment', { layout: 'tabs' } );

			const ready = new Promise( ( resolve, reject ) => {
				const timer = setTimeout( () => {
					// The silent hang (spike T1a). Warn once — no PII, just the
					// marker — then fail loudly enough for the customer to act.
					/* eslint-disable-next-line no-console */
					console.warn( TIMEOUT_MARKER );
					reject( new Error( 'payment-ui-timeout' ) );
				}, readyTimeout );
				element.on( 'ready', () => {
					clearTimeout( timer );
					resolve();
				} );
				element.on( 'loaderror', () => {
					clearTimeout( timer );
					reject( new Error( 'payment-ui-loaderror' ) );
				} );
			} );

			element.on( 'change', ( event ) => {
				complete = !! ( event && event.complete );
				if ( onChange ) {
					onChange( complete );
				}
			} );

			element.mount( holder );

			try {
				await ready;
			} catch ( error ) {
				teardown();
				throw error;
			}
		},

		/**
		 * Show or hide the gateway UI. The shadow panel's `hidden` does not reach
		 * slotted content (measured), so the holder carries it itself.
		 *
		 * @param {boolean} visible Whether the method is the selected one.
		 */
		setVisible( visible ) {
			if ( holder ) {
				holder.hidden = ! visible;
			}
		},

		/**
		 * Push a new total or a re-resolved appearance into a mounted element —
		 * no remount, so nothing the customer typed is lost.
		 *
		 * @param {Object} patch `{amount?, scope?}`.
		 */
		update( patch ) {
			if ( ! patch || torn ) {
				return;
			}
			if ( ! elements ) {
				pendingPatch = { ...pendingPatch, ...patch };
				return;
			}
			const next = {};
			if ( patch.amountMinor ) {
				const amount = toGatewayAmount(
					patch.amountMinor,
					client.gateway_exponent,
					patch.currencyExponent
				);
				// A total the gateway cannot express leaves the previous, working
				// amount in place; the mount path is where that is refused loudly.
				if ( amount !== null ) {
					next.amount = amount;
				}
			}
			if ( patch.scope ) {
				next.appearance = resolveAppearance( patch.scope );
			}
			if ( ! Object.keys( next ).length ) {
				return;
			}
			try {
				elements.update( next );
			} catch {
				// A rejected update leaves the previous, working configuration.
			}
		},

		/**
		 * Run the payment.
		 *
		 * The ORDER is the contract, and it is chosen so that nothing is created
		 * server-side until the card details are known to be well-formed, and
		 * nothing is charged until the slot is held:
		 *
		 *   validate in the element → `begin()` (booking + hold + intent) →
		 *   confirm with the gateway → hand the reference back for `/confirm`
		 *
		 * `begin()` rejections are NOT caught: they are ordinary booking errors
		 * (409, 429, 503…) and the widget already knows how to recover from them.
		 *
		 * @param {Object}   ctx           Context.
		 * @param {Function} ctx.begin     Async; resolves `{response, payment}`.
		 * @param {Function} ctx.returnUrl Builds the return URL from `{order, ref}`.
		 * @return {Promise<Object>} `{status, ...}` — see the switch in `app.jsx`.
		 */
		async submit( ctx ) {
			if ( ! elements || ! sdk ) {
				return { status: 'unmounted' };
			}

			const validation = await elements.submit();
			if ( validation && validation.error ) {
				return {
					status: 'validation',
					message: customerSafeMessage( validation.error ),
				};
			}

			const begun = await ctx.begin();
			const payment = begun.payment || null;
			const secret = payment
				? ( payment.client_params || {} ).client_secret
				: '';
			if ( ! payment || payment.status !== 'begin' || ! secret ) {
				return {
					status: 'unavailable',
					response: begun.response,
					payment,
				};
			}

			const result = await sdk.confirmPayment( {
				elements,
				clientSecret: secret,
				confirmParams: {
					return_url: ctx.returnUrl( {
						order: ( begun.response.booking.order || {} ).code,
						ref: payment.gateway_ref,
					} ),
				},
				// V1 offers synchronous methods only, so a redirect is a bug on
				// the account, not a flow — but the return leg exists anyway.
				redirect: 'if_required',
			} );

			if ( result && result.error ) {
				return {
					status: 'failed',
					message: customerSafeMessage( result.error ),
					response: begun.response,
					payment,
				};
			}

			const intent = ( result && result.paymentIntent ) || null;
			const state = intent && intent.status ? intent.status : '';
			if ( state === 'succeeded' || state === 'processing' ) {
				return {
					status: state === 'succeeded' ? 'succeeded' : 'processing',
					ref: intent.id,
					response: begun.response,
					payment,
				};
			}

			return {
				status: 'failed',
				message: '',
				response: begun.response,
				payment,
			};
		},

		/** Destroy the element, THEN remove its holder (spike T7). */
		destroy() {
			torn = true;
			teardown();
		},
	};
}
