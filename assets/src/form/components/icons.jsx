/** @jsxImportSource preact */
/**
 * Inline SVG icon set. Kept tiny and stroke-based so icons inherit `currentColor`
 * and stay crisp at the widget's small control sizes. No external icon font.
 */

function Svg( { children, viewBox = '0 0 24 24', ...rest } ) {
	return (
		<svg
			viewBox={ viewBox }
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			stroke-width="1.7"
			stroke-linecap="round"
			stroke-linejoin="round"
			{ ...rest }
		>
			{ children }
		</svg>
	);
}

export function IconSearch( props ) {
	return (
		<Svg { ...props }>
			<circle cx="11" cy="11" r="7" />
			<path d="M20 20l-4-4" />
		</Svg>
	);
}

export function IconChevronRight( props ) {
	return (
		<Svg { ...props }>
			<path d="M9 6l6 6-6 6" />
		</Svg>
	);
}

export function IconChevronLeft( props ) {
	return (
		<Svg { ...props }>
			<path d="M15 18l-6-6 6-6" />
		</Svg>
	);
}

export function IconCheck( props ) {
	return (
		<Svg { ...props }>
			<path d="M5 12l5 5L20 6" />
		</Svg>
	);
}

/**
 * The "Any available" avatar mark (D-R51).
 *
 * A four-point sparkle, deliberately NOT a person silhouette and NOT initials: the row does
 * not stand for anybody, so a face would imply one staff member and initials would imply a name.
 * The v4 mockup uses `★` for the same slot (`docs/mockups/v4/booking-form/index.html`, AGENTS
 * data); this is the stroke-based equivalent so it inherits `currentColor` like every other
 * icon here.
 *
 * @param {Object} props SVG props.
 * @return {Object} Icon.
 */
/**
 * The "Any available" mark (D-R51, redrawn to the phase-2 mockup in D-R52).
 *
 * A 4-POINT sparkle with a small companion, not a radial burst: a burst reads as a loading
 * spinner, and this mark has to read as "we'll match you" — never as a person and never as a
 * wait. Carries its own slightly heavier stroke because it renders larger than the rest of the
 * set (20px inside the 44px mark) and the shared 1.7 looked washed out there.
 */
export function IconSparkle( props ) {
	return (
		<Svg stroke-width="1.8" { ...props }>
			<path d="M11 4.2l1.8 4.5 4.5 1.8-4.5 1.8L11 16.8l-1.8-4.5L4.7 10.5l4.5-1.8Z" />
			<path d="M17.8 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" />
		</Svg>
	);
}

/**
 * The Location step's row mark (D-R62) — the v4 mockup's pin (`svg('pin')`), drawn in the same
 * 44px rounded-square slot as the "Any available" sparkle, so a place never reads as a person.
 *
 * @param {Object} props SVG props.
 * @return {Object} Icon.
 */
export function IconPin( props ) {
	return (
		<Svg { ...props }>
			<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11Z" />
			<circle cx="12" cy="10" r="2.5" />
		</Svg>
	);
}

/** Dialog dismiss (D-R52). */
export function IconClose( props ) {
	return (
		<Svg { ...props }>
			<path d="M6 6l12 12M18 6L6 18" />
		</Svg>
	);
}

export function IconAlert( props ) {
	return (
		<Svg { ...props }>
			<path d="M12 3l9 16H3z" />
			<path d="M12 10v4M12 17h.01" />
		</Svg>
	);
}

export function IconInfo( props ) {
	return (
		<Svg { ...props }>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 8h.01M11 12h1v4h1" />
		</Svg>
	);
}

export function IconClock( props ) {
	return (
		<Svg { ...props }>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7v5l3 2" />
		</Svg>
	);
}

/** A price tag — the price line of the one-page intro panel (D-R80). */
export function IconTag( props ) {
	return (
		<Svg { ...props }>
			<path d="M3 12.2V4a1 1 0 0 1 1-1h8.2a1 1 0 0 1 .7.3l8 8a1 1 0 0 1 0 1.4l-8.2 8.2a1 1 0 0 1-1.4 0l-8-8a1 1 0 0 1-.3-.7Z" />
			<circle cx="8" cy="8" r="1.4" />
		</Svg>
	);
}

/** A handset — the "Phone call" meeting method of the one-page intro (D-R82). */
export function IconPhone( props ) {
	return (
		<Svg { ...props }>
			<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
		</Svg>
	);
}

/** A camera — the "Online meeting" method of the one-page intro (D-R82). */
export function IconVideo( props ) {
	return (
		<Svg { ...props }>
			<rect x="3" y="6" width="13" height="12" rx="2" />
			<path d="M16 10.5l5-3v9l-5-3" />
		</Svg>
	);
}

/** A person — the specialist line of the booking summary. */
export function IconUser( props ) {
	return (
		<Svg { ...props }>
			<circle cx="12" cy="8" r="3.5" />
			<path d="M5 20a7 7 0 0 1 14 0" />
		</Svg>
	);
}

export function IconCalendar( props ) {
	return (
		<Svg { ...props }>
			<rect x="3" y="4" width="18" height="17" rx="2" />
			<path d="M3 9h18M8 3v4M16 3v4" />
		</Svg>
	);
}

export function IconDownload( props ) {
	return (
		<Svg { ...props }>
			<path d="M12 3v12M7 10l5 5 5-5" />
			<path d="M4 21h16" />
		</Svg>
	);
}

export function IconPrinter( props ) {
	return (
		<Svg { ...props }>
			<path d="M6 9V3h12v6" />
			<path d="M6 18H4v-6h16v6h-2" />
			<rect x="8" y="15" width="8" height="6" />
		</Svg>
	);
}
