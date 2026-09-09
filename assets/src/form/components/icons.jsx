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
