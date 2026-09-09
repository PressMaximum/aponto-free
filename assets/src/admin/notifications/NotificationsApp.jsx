/**
 * Notifications settings app: list the seeded templates, edit subject/body with the placeholder
 * whitelist, toggle each on/off, and run the fixture test-send.
 *
 * Backed by the existing REST surface (SPEC-P0 §7): GET/PUT `/notifications` and POST
 * `/notifications/test-send`. The PUT replaces ALL templates at once (rest-contract §2.13) and
 * rejects a partial set, so the whole set is held in state and saved together.
 *
 * The two `staff` templates (D-R28) are the one place where "held" and "shown" differ: they are
 * hidden from the list while `multi_staff` is unavailable — nothing would send them, so offering
 * an editor for them would be a control with no effect — but they stay in `templates`, and
 * therefore in the PUT payload, untouched. Filtering them out of state instead would make every
 * save fail the all-keys check.
 *
 * THEME SEAM (A3 kit): this ships as plain @wordpress/components restyled lightly with `--ap-*`
 * tokens. When the A3 design kit lands, the wrapper + tokens below are the hook points — do not
 * introduce `.pd-*` production classes here.
 */

import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	Card,
	CardBody,
	CardHeader,
	Flex,
	FlexBlock,
	FlexItem,
	Notice,
	Spinner,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

import { config, businessTimeLine } from '../lib/config.js';
import { moduleAvailable } from '../modules/catalog.js';
import { dateTimeLabel } from '../lib/format.js';

const boot = window.apontoAdmin || {};

/** Whether this site may use per-staff notifications (D-R28). */
const MULTI_STAFF = moduleAvailable( config, 'multi_staff' );

apiFetch.use( apiFetch.createNonceMiddleware( boot.nonce || '' ) );

const restUrl = ( path ) => ( boot.restBase || '' ) + path;

/**
 * Friendly labels for the seed template keys (SPEC-P1 §3.2 + 2026-07-20 addendum; the two `staff`
 * keys D-R28 added). Several labels repeat across recipients on purpose — the row's second line
 * carries "To: …", which is what actually distinguishes them.
 */
const TEMPLATE_LABELS = {
	booking_received_customer: __( 'Booking received', 'aponto' ),
	booking_confirmed_customer: __( 'Booking confirmed', 'aponto' ),
	booking_rescheduled_customer: __( 'Booking rescheduled', 'aponto' ),
	booking_cancelled_customer: __( 'Booking cancelled', 'aponto' ),
	booking_completed_customer: __( 'Booking completed', 'aponto' ),
	booking_no_show_customer: __( 'Customer did not show up', 'aponto' ),
	booking_reminder_customer: __( 'Reminder (24h before)', 'aponto' ),
	booking_created_admin: __( 'New booking', 'aponto' ),
	booking_cancelled_admin: __( 'Booking cancelled', 'aponto' ),
	booking_created_staff: __( 'New booking', 'aponto' ),
	booking_cancelled_staff: __( 'Booking cancelled', 'aponto' ),
	payment_pending_customer: __( 'Payment still needed', 'aponto' ),
	payment_refunded_customer: __( 'Refund issued', 'aponto' ),
};

/**
 * Which group a template belongs to, in display order. Grouping by RECIPIENT is what makes the
 * list readable once three audiences share the same event names.
 */
const TEMPLATE_GROUPS = [
	{ recipient: 'customer', label: __( 'To the customer', 'aponto' ) },
	{ recipient: 'admin', label: __( 'To you', 'aponto' ) },
	{ recipient: 'staff', label: __( 'To the assigned staff member', 'aponto' ) },
];

/**
 * The templates the list may SHOW. Never used for the PUT payload — see the file header: the
 * request must carry every key the server knows, hidden ones included.
 *
 * @param {Array} items All templates from `GET /notifications`.
 * @return {Array} The subset to render.
 */
function visibleTemplates( items ) {
	return ( items || [] ).filter( ( t ) => MULTI_STAFF || 'staff' !== t.recipient );
}

/** Friendly status labels for the Send log (A3). */
const LOG_STATUS_LABELS = {
	sent: __( 'Sent', 'aponto' ),
	failed: __( 'Failed', 'aponto' ),
	queued: __( 'Queued', 'aponto' ),
	processing: __( 'Sending', 'aponto' ),
};

const recipientLabel = ( recipient ) => {
	if ( 'admin' === recipient ) {
		return __( 'To: site admin', 'aponto' );
	}
	if ( 'staff' === recipient ) {
		return __( 'To: assigned staff', 'aponto' );
	}
	return __( 'To: customer', 'aponto' );
};

/**
 * The whole Notifications settings screen.
 */
export default function NotificationsApp() {
	const [ templates, setTemplates ] = useState( [] );
	const [ selected, setSelected ] = useState( '' );
	const [ sender, setSender ] = useState( { from_name: '', from_email: '', reply_to: '' } );
	const [ loading, setLoading ] = useState( true );
	const [ saving, setSaving ] = useState( false );
	const [ dirty, setDirty ] = useState( false );
	const [ error, setError ] = useState( '' );
	const [ notice, setNotice ] = useState( '' );
	const [ testEmail, setTestEmail ] = useState( '' );
	const [ testing, setTesting ] = useState( false );

	const caret = useRef( { start: null, end: null } );

	useEffect( () => {
		let alive = true;
		apiFetch( { url: restUrl( '/notifications' ) } )
			.then( ( res ) => {
				if ( ! alive ) {
					return;
				}
				const items = Array.isArray( res.items ) ? res.items : [];
				setTemplates( items );
				// Select from what is VISIBLE: landing on a hidden staff template would leave the
				// editor pane showing a row the list does not contain.
				const shown = visibleTemplates( items );
				setSelected( shown.length ? shown[ 0 ].template_key : '' );
				if ( res.sender && typeof res.sender === 'object' ) {
					setSender( {
						from_name: res.sender.from_name || '',
						from_email: res.sender.from_email || '',
						reply_to: res.sender.reply_to || '',
					} );
				}
				setLoading( false );
			} )
			.catch( ( err ) => {
				if ( ! alive ) {
					return;
				}
				setError( err.message || __( 'Could not load templates.', 'aponto' ) );
				setLoading( false );
			} );
		return () => {
			alive = false;
		};
	}, [] );

	const patchSender = ( field, value ) => {
		setSender( ( prev ) => ( { ...prev, [ field ]: value } ) );
		setDirty( true );
		setNotice( '' );
	};

	const current = templates.find( ( t ) => t.template_key === selected ) || null;

	const patch = ( key, changes ) => {
		setTemplates( ( prev ) =>
			prev.map( ( t ) => ( t.template_key === key ? { ...t, ...changes } : t ) )
		);
		setDirty( true );
		setNotice( '' );
	};

	const insertPlaceholder = ( token ) => {
		if ( ! current ) {
			return;
		}
		const text = `{${ token }}`;
		const body = current.body || '';
		const { start, end } = caret.current;
		let next;
		if ( start === null ) {
			next = body + ( body === '' || body.endsWith( '\n' ) || body.endsWith( ' ' ) ? '' : ' ' ) + text;
		} else {
			next = body.slice( 0, start ) + text + body.slice( end );
			caret.current = { start: start + text.length, end: start + text.length };
		}
		patch( current.template_key, { body: next } );
	};

	const save = () => {
		setSaving( true );
		setError( '' );
		setNotice( '' );
		apiFetch( {
			url: restUrl( '/notifications' ),
			method: 'PUT',
			data: {
				items: templates.map( ( t ) => ( {
					template_key: t.template_key,
					subject: t.subject,
					body: t.body,
					enabled: !! t.enabled,
				} ) ),
				sender: {
					from_name: sender.from_name || '',
					from_email: sender.from_email || '',
					reply_to: sender.reply_to || '',
				},
			},
		} )
			.then( ( res ) => {
				const items = Array.isArray( res.items ) ? res.items : templates;
				setTemplates( items );
				if ( res.sender && typeof res.sender === 'object' ) {
					setSender( {
						from_name: res.sender.from_name || '',
						from_email: res.sender.from_email || '',
						reply_to: res.sender.reply_to || '',
					} );
				}
				setDirty( false );
				setSaving( false );
				setNotice( __( 'Changes saved.', 'aponto' ) );
			} )
			.catch( ( err ) => {
				setError( err.message || __( 'Could not save templates.', 'aponto' ) );
				setSaving( false );
			} );
	};

	const sendTest = () => {
		if ( ! current ) {
			return;
		}
		setTesting( true );
		setError( '' );
		setNotice( '' );
		apiFetch( {
			url: restUrl( '/notifications/test-send' ),
			method: 'POST',
			data: { template_key: current.template_key, recipient_email: testEmail },
		} )
			.then( ( res ) => {
				setTesting( false );
				setNotice(
					res && res.sent
						? sprintf(
								/* translators: %s: recipient email. */
								__( 'Test email sent to %s.', 'aponto' ),
								testEmail
						  )
						: __( 'The test email could not be sent. Check your site email settings.', 'aponto' )
				);
			} )
			.catch( ( err ) => {
				setTesting( false );
				setError( err.message || __( 'Could not send the test email.', 'aponto' ) );
			} );
	};

	if ( loading ) {
		return (
			<div className="aponto-notifications" style={ { padding: '24px 0' } }>
				<Spinner />
			</div>
		);
	}

	return (
		<div className="aponto-notifications" style={ { maxWidth: 1040 } }>
			<h1 style={ { fontSize: 23, fontWeight: 600, margin: '4px 0 4px' } }>
				{ __( 'Notifications', 'aponto' ) }
			</h1>
			<p style={ { color: 'var(--ap-color-text-muted, #646970)', marginTop: 0 } }>
				{ __(
					'Emails sent to customers and to you when bookings change. Times use each booking’s timezone.',
					'aponto'
				) }
			</p>

			{ error ? (
				<Notice status="error" isDismissible onRemove={ () => setError( '' ) }>
					{ error }
				</Notice>
			) : null }
			{ notice ? (
				<Notice status="success" isDismissible onRemove={ () => setNotice( '' ) }>
					{ notice }
				</Notice>
			) : null }

			<Flex align="flex-start" gap={ 4 } wrap style={ { marginTop: 12 } }>
				<FlexItem style={ { flexBasis: 320, flexGrow: 0 } }>
					<Card>
						<CardHeader>
							<strong>{ __( 'Templates', 'aponto' ) }</strong>
						</CardHeader>
						<CardBody style={ { padding: 0 } }>
							{ /* Grouped by recipient (D-R28): three audiences reuse the same event
							     names, so an ungrouped list would read as duplicate rows. A group
							     with nothing to show renders nothing at all — no empty heading. */ }
							{ TEMPLATE_GROUPS.map( ( group ) => {
								const rows = visibleTemplates( templates ).filter( ( t ) => t.recipient === group.recipient );
								if ( ! rows.length ) {
									return null;
								}
								return (
									<div key={ group.recipient }>
										<div style={ { padding: '8px 16px 4px', color: 'var( --ap-color-text-soft, #757575 )', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' } }>
											{ group.label }
										</div>
										<ul style={ { margin: 0 } }>
											{ rows.map( ( t ) => (
												<TemplateRow
													key={ t.template_key }
													template={ t }
													active={ t.template_key === selected }
													onSelect={ () => setSelected( t.template_key ) }
													onToggle={ ( enabled ) => patch( t.template_key, { enabled } ) }
												/>
											) ) }
										</ul>
									</div>
								);
							} ) }
						</CardBody>
					</Card>
				</FlexItem>

				<FlexBlock style={ { minWidth: 360 } }>
					{ current ? (
						<Editor
							template={ current }
							placeholders={ boot.placeholders || [] }
							urlKeys={ boot.urlKeys || [] }
							onField={ ( field, value ) => patch( current.template_key, { [ field ]: value } ) }
							onInsert={ insertPlaceholder }
							onCaret={ ( c ) => {
								caret.current = c;
							} }
							testEmail={ testEmail }
							onTestEmail={ setTestEmail }
							onTest={ sendTest }
							testing={ testing }
						/>
					) : null }
				</FlexBlock>
			</Flex>

			<SenderPanel sender={ sender } onField={ patchSender } />

			<div style={ { marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' } }>
				<Button variant="primary" onClick={ save } isBusy={ saving } disabled={ saving || ! dirty }>
					{ __( 'Save changes', 'aponto' ) }
				</Button>
				{ dirty ? (
					<span style={ { color: 'var(--ap-color-text-muted, #646970)' } }>
						{ __( 'You have unsaved changes.', 'aponto' ) }
					</span>
				) : null }
			</div>

			<SendLog />
		</div>
	);
}

/**
 * Sender identity panel (A2): From name/email + optional Reply-To. Empty = the site default. Saved
 * together with the templates by the Save button above (the values ride the same PUT /notifications).
 */
function SenderPanel( { sender, onField } ) {
	return (
		<Card style={ { marginTop: 24 } }>
			<CardHeader>
				<strong>{ __( 'Sender', 'aponto' ) }</strong>
			</CardHeader>
			<CardBody>
				<p style={ { marginTop: 0, color: 'var(--ap-color-text-muted, #646970)' } }>
					{ __(
						'Who booking emails come from. Leave blank to use your site’s default. Applies only to Aponto’s emails.',
						'aponto'
					) }
				</p>
				<Flex align="flex-start" gap={ 4 } wrap>
					<FlexBlock style={ { minWidth: 220 } }>
						<TextControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={ __( 'From name', 'aponto' ) }
							value={ sender.from_name || '' }
							onChange={ ( value ) => onField( 'from_name', value ) }
							placeholder={ __( 'Your business name', 'aponto' ) }
						/>
					</FlexBlock>
					<FlexBlock style={ { minWidth: 220 } }>
						<TextControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							type="email"
							label={ __( 'From email', 'aponto' ) }
							value={ sender.from_email || '' }
							onChange={ ( value ) => onField( 'from_email', value ) }
							placeholder="bookings@example.com"
						/>
					</FlexBlock>
					<FlexBlock style={ { minWidth: 220 } }>
						<TextControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							type="email"
							label={ __( 'Reply-To (optional)', 'aponto' ) }
							value={ sender.reply_to || '' }
							onChange={ ( value ) => onField( 'reply_to', value ) }
							placeholder="you@example.com"
						/>
					</FlexBlock>
				</Flex>
				<p style={ { fontSize: 12, color: 'var(--ap-color-text-muted, #646970)', marginBottom: 0 } }>
					{ __(
						'Some hosts require the From address to be on your own domain to avoid spam filtering.',
						'aponto'
					) }
				</p>
			</CardBody>
		</Card>
	);
}

/**
 * Read-only Send log (A3 — U4): a page of the deliveries ledger (time, template, masked recipient,
 * status, error) for debugging "the customer didn't get the email". View-only — no resend in V1.
 */
function SendLog() {
	const [ rows, setRows ] = useState( [] );
	const [ page, setPage ] = useState( 1 );
	const [ total, setTotal ] = useState( 0 );
	const [ perPage, setPerPage ] = useState( 20 );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( '' );

	const load = ( toPage = page ) => {
		setLoading( true );
		setError( '' );
		apiFetch( { url: restUrl( `/notifications/log?page=${ toPage }&per_page=20` ) } )
			.then( ( res ) => {
				setRows( Array.isArray( res.items ) ? res.items : [] );
				setTotal( Number( res.total || 0 ) );
				setPerPage( Number( res.per_page || 20 ) );
				setPage( Number( res.page || toPage ) );
				setLoading( false );
			} )
			.catch( ( err ) => {
				setError( err.message || __( 'Could not load the send log.', 'aponto' ) );
				setLoading( false );
			} );
	};

	useEffect( () => {
		load( 1 );
		// eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only.
	}, [] );

	const lastPage = Math.max( 1, Math.ceil( total / ( perPage || 20 ) ) );
	const cell = { padding: '8px 10px', borderBottom: '1px solid var(--ap-color-border, #e0e0e0)', fontSize: 13, textAlign: 'left', verticalAlign: 'top' };

	return (
		<Card style={ { marginTop: 24 } }>
			<CardHeader style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }>
				{ /* The "Business time · City (GMT±N)" context line every other timestamped
				     surface carries (lib/config.js `businessTimeLine`) — the Time column is
				     rendered in that zone, so the screen says which zone it means. */ }
				<span>
					<strong style={ { display: 'block' } }>{ __( 'Send log', 'aponto' ) }</strong>
					<span style={ { fontSize: 12, color: 'var(--ap-color-text-muted, #646970)' } }>{ businessTimeLine }</span>
				</span>
				<Button variant="secondary" onClick={ () => load( page ) } isBusy={ loading } size="small">
					{ __( 'Refresh', 'aponto' ) }
				</Button>
			</CardHeader>
			<CardBody style={ { padding: 0 } }>
				{ error ? (
					<div style={ { padding: 16 } }>
						<Notice status="error" isDismissible={ false }>
							{ error }
						</Notice>
					</div>
				) : null }
				{ loading && rows.length === 0 ? (
					<div style={ { padding: 24 } }>
						<Spinner />
					</div>
				) : null }
				{ ! loading && rows.length === 0 && ! error ? (
					<p style={ { padding: 16, color: 'var(--ap-color-text-muted, #646970)', margin: 0 } }>
						{ __( 'No emails have been sent yet.', 'aponto' ) }
					</p>
				) : null }
				{ rows.length > 0 ? (
					<div style={ { overflowX: 'auto' } }>
						<table style={ { width: '100%', borderCollapse: 'collapse' } }>
							<thead>
								<tr>
									<th style={ { ...cell, fontWeight: 600 } }>{ __( 'Time', 'aponto' ) }</th>
									<th style={ { ...cell, fontWeight: 600 } }>{ __( 'Email', 'aponto' ) }</th>
									<th style={ { ...cell, fontWeight: 600 } }>{ __( 'To', 'aponto' ) }</th>
									<th style={ { ...cell, fontWeight: 600 } }>{ __( 'Status', 'aponto' ) }</th>
								</tr>
							</thead>
							<tbody>
								{ rows.map( ( row ) => (
									<tr key={ row.id }>
										<td style={ cell }>{ formatLogTime( row.updated_at || row.created_at ) }</td>
										<td style={ cell }>{ TEMPLATE_LABELS[ row.template_key ] || row.template_key }</td>
										<td style={ { ...cell, fontFamily: 'monospace' } }>{ row.recipient_masked || '—' }</td>
										<td style={ cell }>
											<LogStatus status={ row.status } error={ row.error } />
										</td>
									</tr>
								) ) }
							</tbody>
						</table>
					</div>
				) : null }
			</CardBody>
			{ total > perPage ? (
				<div style={ { display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', borderTop: '1px solid var(--ap-color-border, #e0e0e0)' } }>
					<Button variant="tertiary" size="small" disabled={ page <= 1 || loading } onClick={ () => load( page - 1 ) }>
						{ __( 'Previous', 'aponto' ) }
					</Button>
					<span style={ { fontSize: 12, color: 'var(--ap-color-text-muted, #646970)' } }>
						{ sprintf(
							/* translators: 1: current page, 2: total pages. */
							__( 'Page %1$d of %2$d', 'aponto' ),
							page,
							lastPage
						) }
					</span>
					<Button variant="tertiary" size="small" disabled={ page >= lastPage || loading } onClick={ () => load( page + 1 ) }>
						{ __( 'Next', 'aponto' ) }
					</Button>
				</div>
			) : null }
		</Card>
	);
}

/** A status pill for the Send log, with the failure reason as a tooltip. */
function LogStatus( { status, error } ) {
	const label = LOG_STATUS_LABELS[ status ] || status;
	const failed = status === 'failed';
	return (
		<span
			title={ error || '' }
			style={ {
				fontSize: 12,
				fontWeight: 600,
				padding: '2px 8px',
				borderRadius: 999,
				color: failed ? 'var(--ap-color-danger, #b32d2e)' : 'var(--ap-color-text-muted, #646970)',
				border: '1px solid var(--ap-color-border-strong, #c3c4c7)',
			} }
		>
			{ label }{ failed && error ? ` · ${ error }` : '' }
		</span>
	);
}

/**
 * Format an SQL UTC timestamp for the log in BUSINESS time, falling back to the raw value.
 *
 * `toLocaleString()` rendered every row in whatever zone the viewing browser happens to sit in,
 * unlabelled — so the same log read differently for the owner and the agency looking after the
 * site, and neither reading matched the bookings list. Every admin surface shows one display
 * timezone (§5 invariant 6): the business one, announced by the card's `businessTimeLine`.
 */
function formatLogTime( sql ) {
	if ( ! sql ) {
		return '';
	}
	const iso = sql.includes( 'T' ) ? sql : sql.replace( ' ', 'T' ) + 'Z';
	if ( Number.isNaN( new Date( iso ).getTime() ) ) {
		return sql;
	}

	return dateTimeLabel( iso );
}

/**
 * A single row in the template list: name, recipient/trigger, on/off toggle.
 */
function TemplateRow( { template, active, onSelect, onToggle } ) {
	const label = TEMPLATE_LABELS[ template.template_key ] || template.template_key;

	return (
		<li
			style={ {
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				padding: '10px 14px',
				borderBottom: '1px solid var(--ap-color-border, #e0e0e0)',
				background: active ? 'var(--ap-color-accent-subtle, #f0f0f1)' : 'transparent',
			} }
		>
			<button
				type="button"
				onClick={ onSelect }
				style={ {
					flex: 1,
					textAlign: 'left',
					background: 'none',
					border: 0,
					cursor: 'pointer',
					padding: 0,
				} }
			>
				<span style={ { display: 'block', fontWeight: 600 } }>{ label }</span>
				<span style={ { display: 'block', fontSize: 12, color: 'var(--ap-color-text-muted, #646970)' } }>
					{ recipientLabel( template.recipient ) } · { template.trigger_event }
				</span>
			</button>
			{ /* The row title beside the toggle is the visible label, so the control
			     itself needs a screen-reader-only one. `aria-label` is NOT forwarded
			     to ToggleControl's checkbox, and `label=""` renders an EMPTY <label
			     for> — which left the input with no accessible name at all (axe
			     `label`, critical). Give it the real label and hide that element
			     visually instead. */ }
			<ToggleControl
				__nextHasNoMarginBottom
				className="ap-toggle-label-sr"
				checked={ !! template.enabled }
				onChange={ onToggle }
				label={ sprintf(
					/* translators: %s: template name. */
					__( 'Enable %s email', 'aponto' ),
					TEMPLATE_LABELS[ template.template_key ] || template.template_key
				) }
			/>
		</li>
	);
}

/**
 * The per-template editor: subject, placeholder chips, body, and the fixture test-send.
 */
function Editor( {
	template,
	placeholders,
	urlKeys,
	onField,
	onInsert,
	onCaret,
	testEmail,
	onTestEmail,
	onTest,
	testing,
} ) {
	const captureCaret = ( e ) =>
		onCaret( { start: e.target.selectionStart, end: e.target.selectionEnd } );

	return (
		<Card>
			<CardHeader>
				<strong>{ TEMPLATE_LABELS[ template.template_key ] || template.template_key }</strong>
			</CardHeader>
			<CardBody>
				<TextControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Subject', 'aponto' ) }
					value={ template.subject || '' }
					onChange={ ( value ) => onField( 'subject', value ) }
				/>

				<div style={ { margin: '16px 0 6px', fontSize: 12, fontWeight: 600 } }>
					{ __( 'Placeholders', 'aponto' ) }
				</div>
				<div style={ { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } }>
					{ placeholders.map( ( token ) => (
						<button
							key={ token }
							type="button"
							onClick={ () => onInsert( token ) }
							title={ __( 'Insert into body', 'aponto' ) }
							style={ {
								fontSize: 12,
								fontFamily: 'monospace',
								padding: '3px 8px',
								borderRadius: 999,
								border: '1px solid var(--ap-color-border-strong, #c3c4c7)',
								background: urlKeys.includes( token )
									? 'var(--ap-color-accent-subtle, #f0f0f1)'
									: 'var(--ap-color-surface-muted, #f6f7f7)',
								cursor: 'pointer',
							} }
						>
							{ `{${ token }}` }
						</button>
					) ) }
				</div>

				<TextareaControl
					__nextHasNoMarginBottom
					label={ __( 'Body', 'aponto' ) }
					help={ __( 'Plain text. Line breaks become paragraphs in the email.', 'aponto' ) }
					rows={ 10 }
					value={ template.body || '' }
					onChange={ ( value ) => onField( 'body', value ) }
					onSelect={ captureCaret }
					onKeyUp={ captureCaret }
					onClick={ captureCaret }
				/>

				<div
					style={ {
						marginTop: 18,
						paddingTop: 16,
						borderTop: '1px solid var(--ap-color-border, #e0e0e0)',
					} }
				>
					<div style={ { fontSize: 12, fontWeight: 600, marginBottom: 6 } }>
						{ __( 'Send a test', 'aponto' ) }
					</div>
					<Flex align="flex-end" gap={ 3 }>
						<FlexBlock>
							<TextControl
								__nextHasNoMarginBottom
								__next40pxDefaultSize
								type="email"
								label={ __( 'Recipient email', 'aponto' ) }
								value={ testEmail }
								onChange={ onTestEmail }
								placeholder="you@example.com"
							/>
						</FlexBlock>
						<FlexItem>
							<Button
								variant="secondary"
								onClick={ onTest }
								isBusy={ testing }
								disabled={ testing || ! testEmail }
							>
								{ __( 'Send test', 'aponto' ) }
							</Button>
						</FlexItem>
					</Flex>
					<p style={ { fontSize: 12, color: 'var(--ap-color-text-muted, #646970)', marginBottom: 0 } }>
						{ __( 'Uses a sample booking. Save your changes first to test the latest text.', 'aponto' ) }
					</p>
				</div>
			</CardBody>
		</Card>
	);
}
