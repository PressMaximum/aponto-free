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

	const save = () => {
		const invalid = validateWeekly( weekly );
		if ( invalid ) {
			setError( invalid );
			setNotice( '' );
			return;
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
		api
			.put( '/business-hours', payload )
			.then( ( res ) => {
				const map = toMap( res.weekly );
				setWeekly( map );
				setSaved( map );
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
	};

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
						<WeeklyHoursGrid weekly={ weekly } onChange={ setWeekly } busy={ saving } timeFormat={ config.settings.timeFormat } />
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
