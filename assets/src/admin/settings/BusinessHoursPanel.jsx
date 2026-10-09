/**
 * Business hours panel (SPEC-P1 §1.3), folded into Settings → General so a founder
 * who SKIPPED the setup wizard still has a place to set weekly opening hours
 * (finding U4-03a — without this the manual path leaves every day Closed and no
 * availability ever appears).
 *
 * Reads/writes the `staff_id = 0` wildcard weekly grid through GET/PUT
 * `/business-hours`; staff inherit these rows. Reuses the shared {@link WeeklyHoursGrid}
 * (same editor the per-staff "Customize" flow uses) and the same period validation
 * the REST layer enforces, so an invalid grid is caught before the round-trip.
 */
import { Button, Card, CardBody, CardHeader, Notice, Spinner } from '@wordpress/components';
import { useCallback, useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { useInFlight } from '../lib/in-flight.js';
import {
	WEEKDAYS,
	WeeklyHoursGrid,
	sortWeekly,
	validateWeekly,
} from '../lib/WeeklyHoursGrid.jsx';

/** Response weekly (`[{weekday, periods:[{start_minute,end_minute}]}]`) → grid map with all 7 days present. */
function toMap( weekly ) {
	const map = {};
	WEEKDAYS.forEach( ( [ n ] ) => {
		map[ n ] = [];
	} );
	( weekly || [] ).forEach( ( row ) => {
		map[ row.weekday ] = ( row.periods || [] ).map( ( p ) => ( {
			start: p.start_minute,
			end: p.end_minute,
		} ) );
	} );
	return map;
}

export default function BusinessHoursPanel() {
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( '' );
	const [ notice, setNotice ] = useState( '' );
	const [ weekly, setWeekly ] = useState( {} );
	const [ saved, setSaved ] = useState( {} );
	const [ saving, setSaving ] = useState( false );

	const load = useCallback( () => {
		setLoading( true );
		setError( '' );
		api
			.get( '/business-hours' )
			.then( ( res ) => {
				const map = toMap( res.weekly );
				setWeekly( map );
				setSaved( map );
				setLoading( false );
			} )
			.catch( ( err ) => {
				setError( err.message || __( 'Could not load business hours.', 'aponto' ) );
				setLoading( false );
			} );
	}, [] );
	useEffect( load, [ load ] );

	// Deep-link scroll from the Dashboard "Business time → Manage" action (U4-03c).
	useEffect( () => {
		if ( typeof window !== 'undefined' && window.__apontoScrollToHours ) {
			window.__apontoScrollToHours = false;
			// Wait for the first paint (and the settings load) before scrolling.
			const id = window.setTimeout( () => {
				document.getElementById( 'ap-business-hours' )?.scrollIntoView( { behavior: 'smooth', block: 'start' } );
			}, 150 );
			return () => window.clearTimeout( id );
		}
		return undefined;
	}, [ loading ] );

	const dirty = JSON.stringify( weekly ) !== JSON.stringify( saved );

	// An edit answers the notice it was made for (persona QA 2026-10-05, T-070): "Monday: hours
	// overlap" stayed on screen after the times had been fixed, and "Business hours saved." after
	// the grid had been changed again — both then described a week that was no longer on screen.
	const edit = ( next ) => {
		setWeekly( next );
		setError( '' );
		setNotice( '' );
	};

	// One PUT per press (T-065). The button is disabled from `saving`, but state only reaches the
	// DOM on the next render: two taps in one frame both sent the full replacement, and before the
	// server serialized it they interleaved and stored every range twice.
	const once = useInFlight();
	const save = () => once( () => {
		const invalid = validateWeekly( weekly );
		if ( invalid ) {
			// `validateWeekly()` answers `{ message, weekday, index }` since 2026-09-21; this
			// panel has no scroll target to use the locator for, so it takes the sentence.
			setError( invalid.message );
			setNotice( '' );
			return undefined;
		}
		const sorted = sortWeekly( weekly );
		setSaving( true );
		setError( '' );
		setNotice( '' );
		const payload = {
			weekly: WEEKDAYS.map( ( [ n ] ) => ( {
				weekday: n,
				periods: ( sorted[ n ] || [] ).map( ( p ) => ( {
					start_minute: p.start,
					end_minute: p.end,
				} ) ),
			} ) ),
		};
		return api
			.put( '/business-hours', payload )
			.then( ( res ) => {
				const map = toMap( res.weekly );
				setWeekly( map );
				setSaved( map );
				// The boot snapshot other screens resolve inherited hours against (the staff
				// editor's "inherits business hours" list, the Calendar's shading) is a page-load
				// copy: without this it kept showing the OLD week until a reload (re-test N10).
				if ( Array.isArray( res.weekly ) ) {
					config.businessHours = res.weekly;
				}
				setSaving( false );
				setNotice( __( 'Business hours saved.', 'aponto' ) );
			} )
			.catch( ( err ) => {
				setSaving( false );
				if ( err.data && err.data.fields && err.data.fields.weekly ) {
					setError( err.data.fields.weekly );
				} else {
					setError( err.message || __( 'Could not save business hours.', 'aponto' ) );
				}
			} );
	} );

	return (
		<Card className="ap-settings-card" id="ap-business-hours">
			<CardHeader>
				<div>
					<h2 className="ap-settings-card-title">{ __( 'Business hours', 'aponto' ) }</h2>
					<p className="ap-settings-card-desc">
						{ __(
							'The weekly opening hours every staff member inherits. Set a day Closed to block it.',
							'aponto'
						) }
					</p>
				</div>
			</CardHeader>
			<CardBody>
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
				{ loading ? (
					<Spinner />
				) : (
					<>
						<WeeklyHoursGrid weekly={ weekly } onChange={ edit } busy={ saving } timeFormat={ config.settings.timeFormat } />
						<div className="ap-hours-save">
							<Button
								variant="primary"
								className="pd-button primary sm"
								isBusy={ saving }
								disabled={ saving || ! dirty }
								onClick={ save }
							>
								{ saving ? __( 'Saving…', 'aponto' ) : __( 'Save business hours', 'aponto' ) }
							</Button>
						</div>
					</>
				) }
			</CardBody>
		</Card>
	);
}
