/**
 * Field-level validation plumbing for the full-page record editors (founder QA 2026-09-21,
 * round 2 — adversarial review finding P2).
 *
 * TWO DEFECTS, ONE CAUSE. Each editor wired `fieldError` into its controls BY HAND, one field
 * at a time, so the wiring was only as complete as whoever last added a field remembered to
 * make it:
 *
 *  1. **Server keys with no inline home.** `ServicesController::validateBody()` can reject
 *     twelve field keys; the Service editor rendered `.has-error` for five. A `422` naming
 *     `buffer_before` therefore lit nothing, which since the round-1 change means
 *     `focusFirstError()` finds nothing to go to and the operator is left with the generic
 *     "The submitted data is invalid" and no idea which control it means. The Staff editor had
 *     the same hole for `phone`, `status`, `avatar_id` and `is_public`.
 *  2. **No accessible association.** `.pd-compact-field.has-error input` carried neither
 *     `aria-invalid` nor `aria-describedby`, so the red border and the sentence under it were
 *     invisible to a screen reader — the error existed only as a colour.
 *
 * So the plumbing becomes three tiny functions plus one component, and a field is wired by
 * naming its key once. The remaining discipline is a list — {@see FieldErrors} renders every
 * key an editor knows about — which a test can compare against the controller's own key set.
 */

/**
 * The DOM id of the paragraph that carries one field's message.
 *
 * Namespaced per editor so the two can coexist (the booking inspector can host one while a
 * record editor is mounted) and so an id collision cannot point `aria-describedby` at the wrong
 * sentence.
 *
 * @param {string} prefix Editor namespace, e.g. `service`.
 * @param {string} key    Server field key.
 * @return {string} Element id.
 */
export function fieldErrorId( prefix, key ) {
	return `${ prefix }-${ key }-error`;
}

/**
 * Add `has-error` to a field wrapper's class list when that key was rejected.
 *
 * @param {string} base       Base class list.
 * @param {Object} fieldError Errors by server key.
 * @param {...string} keys    Keys this control answers for (aliases included).
 * @return {string} Class list.
 */
export function fieldClass( base, fieldError, ...keys ) {
	return keys.some( ( key ) => fieldError?.[ key ] ) ? `${ base } has-error` : base;
}

/**
 * The ARIA a control needs while it is rejected.
 *
 * Spread onto the input/select/textarea itself, never onto the wrapper: `aria-invalid` belongs
 * to the thing that is invalid, and `aria-describedby` has to be on the control for the message
 * to be announced when focus lands there — which, since the round-1 change, is exactly what
 * happens on a failed save.
 *
 * @param {string} prefix     Editor namespace.
 * @param {Object} fieldError Errors by server key.
 * @param {...string} keys    Keys this control answers for.
 * @return {Object} Props to spread, or an empty object.
 */
export function fieldAria( prefix, fieldError, ...keys ) {
	const hit = keys.find( ( key ) => fieldError?.[ key ] );

	return hit
		? { 'aria-invalid': 'true', 'aria-describedby': fieldErrorId( prefix, hit ) }
		: {};
}

/**
 * The message(s) for one or more keys, as the paragraph `aria-describedby` points at.
 *
 * `role="alert"` is deliberately NOT set: on a failed save the operator is moved to the control
 * and the description is announced with it, so an alert would say the same sentence twice. The
 * paragraph is an ordinary description, which is what it is.
 *
 * @param {Object} props            Props.
 * @param {string} props.prefix     Editor namespace.
 * @param {Object} props.fieldError Errors by server key.
 * @param {Array}  props.keys       Keys to render, in order.
 * @param {string} [props.className] Extra class — the grid sections span the full row.
 * @return {JSX.Element|null} The messages, or nothing.
 */
export function FieldErrors( { prefix, fieldError, keys, className } ) {
	const present = keys.filter( ( key ) => fieldError?.[ key ] );
	if ( ! present.length ) {
		return null;
	}

	return (
		<>
			{ present.map( ( key ) => (
				<p
					key={ key }
					id={ fieldErrorId( prefix, key ) }
					className={ className ? `ap-field-error ${ className }` : 'ap-field-error' }
				>
					{ fieldError[ key ] }
				</p>
			) ) }
		</>
	);
}
