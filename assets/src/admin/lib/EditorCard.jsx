/**
 * One CARD section of a full-page record editor (D-R55).
 *
 * The founder's reference is the Settings panel (`settings/SettingsApp.jsx`): a white surface
 * with a 1px border and a radius, a header holding the panel title and a one-line muted
 * description, a hairline under the header, then the fields in a padded body. Rather than
 * reproduce that look a second time, this component renders the SAME thing: the
 * `@wordpress/components` `Card`/`CardHeader`/`CardBody` trio carrying `.ap-settings-card`,
 * `.ap-settings-card-title` and `.ap-settings-card-desc`. One card anatomy, one stylesheet,
 * so a change to the Settings panels lands here too.
 *
 * `@wordpress/components` is an EXTERNAL in this build (`wp-components`, already a dependency
 * of the admin entry because the Settings chunk uses it), so the import costs the lazy chunk
 * no bytes.
 *
 * What this adds on top of a plain Settings card is the editor contract: the card is a real
 * `<section>` with the anchor id the sticky section nav scrolls to and the IntersectionObserver
 * watches, and it is labelled by its own heading (`aria-labelledby`) so the landmark is named.
 * The header can carry a trailing action (Customize, Add time off) at the inline end.
 *
 * REUSABLE ON PURPOSE, and reused: the Service editor took the same two steps on 2026-09-21 —
 * wrap its sections in `EditorCard`, add `ap-editor-cards` to the form element — which closes
 * the one-release gap D-R55 recorded between the two full-page record editors. Nothing here is
 * staff-specific. The remaining holdout on this shell is the Premium `multi_location` Location
 * form, which is owned elsewhere and is single-section.
 *
 * @param {Object}          props             Card props.
 * @param {string}          props.id          Anchor id, e.g. `staff-details`.
 * @param {string}          props.title       Card title (renders as the section's `h2`).
 * @param {string}          [props.description] One-line muted description under the title.
 * @param {import('react').ReactNode} [props.action]   Trailing header control.
 * @param {string}          [props.className] Extra class on the `<section>`.
 * @param {string}          [props.bodyClassName] Extra class on the body wrapper — the Service
 *                                            editor's grid sections need `pd-form-grid` here.
 * @param {import('react').ReactNode} props.children   Card body.
 * @return {JSX.Element} The card section.
 */
import { Card, CardBody, CardHeader } from '@wordpress/components';

export function EditorCard( { id, title, description, action, className, bodyClassName, children } ) {
	const headingId = `${ id }-heading`;

	return (
		<section
			id={ id }
			className={ className ? `ap-editor-card ${ className }` : 'ap-editor-card' }
			aria-labelledby={ headingId }
		>
			<Card className="ap-settings-card">
				<CardHeader>
					<div className="ap-editor-card-head">
						<div className="ap-editor-card-head-copy">
							<h2 id={ headingId } className="ap-settings-card-title">
								{ title }
							</h2>
							{ description ? (
								<p className="ap-settings-card-desc">{ description }</p>
							) : null }
						</div>
						{ action || null }
					</div>
				</CardHeader>
				<CardBody>
					<div className={ bodyClassName ? `pd-editor-section-body ${ bodyClassName }` : 'pd-editor-section-body' }>
						{ children }
					</div>
				</CardBody>
			</Card>
		</section>
	);
}
