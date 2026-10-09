/**
 * Settings → Booking → Form presentation → "Booking page" (D-R75).
 *
 * Which WordPress page hosts the booking form. The onboarding wizard records it once; this card
 * is where it stays editable. One kit select through the same SchemaForm every schema panel uses,
 * sharing SettingsApp's dirty state and SaveBar — there is no second Save button on the screen.
 *
 * Everything said ABOUT a page is server-computed and shown only for the SAVED page: the
 * "no booking form on this page" warning comes from `booking_page.has_form`, and the "no longer
 * published" notice from `booking_page.unpublished` (rest-contract §2.11 addendum D-R75). A page
 * merely selected in the menu is described after it has been saved.
 */
import { Button, Card, CardBody, CardHeader, Notice } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { SchemaForm, BASE_FIELD_TYPES, panelHeadingId } from '@pressmaximum/dashboard-kit';

import { config } from '../lib/config.js';
import { BOOKING_PAGE_KEY, bookingPageOptions, pagesUrl } from './booking-page.js';

const PANEL_ID = 'booking_page';

export default function BookingPagePanel( { value, saved, error, onFieldChange } ) {
	const [ pages, setPages ] = useState( [] );

	useEffect( () => {
		let alive = true;
		fetch( pagesUrl( config.restUrl ), { headers: { 'X-WP-Nonce': config.nonce }, credentials: 'same-origin' } )
			.then( ( response ) => ( response.ok ? response.json() : [] ) )
			.then( ( list ) => alive && Array.isArray( list ) && setPages( list ) )
			// The saved page is still offered (bookingPageOptions), so a failed list degrades
			// to "keep or clear", never to a broken control.
			.catch( () => {} );
		return () => {
			alive = false;
		};
	}, [] );

	const selected = Number( value ) || 0;
	const isSaved = selected === saved.id;
	const help = __(
		'Email links, the “Pay now” link and checkout back-links open this page.',
		'aponto'
	);
	const panel = {
		id: PANEL_ID,
		fields: [
			{
				id: BOOKING_PAGE_KEY,
				type: 'select',
				label: __( 'Page', 'aponto' ),
				description: error ? (
					<>
						<span>{ help } </span>
						<span className="ap-field-error">{ error }</span>
					</>
				) : (
					help
				),
				options: bookingPageOptions( pages, saved ),
			},
		],
	};

	return (
		<Card className="ap-settings-card">
			<CardHeader>
				<div>
					<h2 id={ panelHeadingId( PANEL_ID ) } className="ap-settings-card-title">
						{ __( 'Booking page', 'aponto' ) }
					</h2>
					<p className="ap-settings-card-desc">
						{ __( 'The page on your site that customers book on.', 'aponto' ) }
					</p>
				</div>
			</CardHeader>
			<CardBody>
				{ saved.unpublished && selected === 0 ? (
					<Notice status="warning" isDismissible={ false }>
						{ __(
							'The page that was set as your booking page is no longer published, so nothing links to it. Choose a published page.',
							'aponto'
						) }
					</Notice>
				) : null }
				<SchemaForm
					panel={ panel }
					values={ { [ PANEL_ID ]: { [ BOOKING_PAGE_KEY ]: String( selected ) } } }
					onFieldChange={ onFieldChange }
					fieldTypes={ BASE_FIELD_TYPES }
				/>
				{ isSaved && selected > 0 && ! saved.hasForm ? (
					<Notice status="warning" isDismissible={ false }>
						{ __(
							'This page does not contain the Aponto booking form block. Add the block to the page so customers can book there.',
							'aponto'
						) }
					</Notice>
				) : null }
				<div className="ap-settings-actions-row">
					{ isSaved && selected > 0 && saved.permalink ? (
						<Button variant="secondary" href={ saved.permalink } target="_blank" rel="noreferrer noopener">
							{ __( 'View page', 'aponto' ) }
						</Button>
					) : null }
					{ isSaved && selected > 0 && saved.editUrl ? (
						<Button variant="secondary" href={ saved.editUrl }>
							{ __( 'Edit page', 'aponto' ) }
						</Button>
					) : null }
					{ saved.id === 0 && selected === 0 && config.wizardUrl ? (
						<Button variant="secondary" href={ config.wizardUrl }>
							{ __( 'Create a booking page', 'aponto' ) }
						</Button>
					) : null }
				</div>
			</CardBody>
		</Card>
	);
}
