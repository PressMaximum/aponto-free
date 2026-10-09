/** Free owns no service deposit editor or policy writes (D-R41). */
const NONE = Object.freeze( {
	dirty: false,
	ready: true,
	section: null,
	nav: null,
	validate: () => {},
	save: async () => {},
} );
export function useServiceDeposit() {
	return NONE;
}
