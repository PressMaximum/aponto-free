/** @jsxImportSource preact */
/**
 * Feedback surfaces: the inverse toast (409 slot-taken) and the warn/err/info
 * banners (429/425/503/network/guard). Both expose a stable error CODE to the
 * client via the caller, but only public-safe copy to the visitor (SPEC-P0 §8.2).
 * Toast and banners carry `role="status"` + `aria-live` so AT announces them
 * (REVIEW §2 #17).
 */
import { IconAlert, IconInfo, IconClock, IconCheck } from './icons.jsx';

export function Toast( { title, body } ) {
	return (
		<div class="ap-toast" role="status" aria-live="polite">
			<IconAlert />
			<span class="toast-copy">
				<b>{ title }</b>
				{ body ? <span>{ body }</span> : null }
			</span>
		</div>
	);
}

const BANNER_ICON = {
	warn: IconAlert,
	err: IconAlert,
	info: IconInfo,
	clock: IconClock,
	success: IconCheck,
};

export function Banner( { variant = 'info', title, body, children } ) {
	const Icon = BANNER_ICON[ variant ] || IconInfo;
	const cssVariant = variant === 'clock' || variant === 'success' ? 'info' : variant;
	return (
		<div class={ 'ap-banner ' + cssVariant } role="status" aria-live="polite">
			<Icon />
			<div>
				{ title ? <b>{ title }</b> : null }
				{ title && ( body || children ) ? <br /> : null }
				{ body ? <span class="mut">{ body }</span> : null }
				{ children }
			</div>
		</div>
	);
}
