/**
 * Clean placeholder for routes not built in this batch (B4a). Honest empty-state,
 * no fake controls (SPEC-P1 §1.0 clean-room; mockup §5.4 phase badges are IA, not
 * shipped functionality). Reserved P4/P4+ routes say so plainly.
 */
import { PageHeader } from '../lib/ui.jsx';
import { renderIcon } from '../lib/icon.jsx';

const COPY = {
	customers: { icon: 'people', desc: 'Customer search, aggregates and booking history live here.', building: true },
	services: { icon: 'briefcase', desc: 'Services, categories and the service editor live here.', building: true },
	staff: { icon: 'user', desc: 'Staff list, work hours, overrides and blocked periods live here.', building: true },
	modules: { icon: 'box', desc: 'The module catalog — booking, payments, connections and site tools.', building: true },
	settings: { icon: 'settings', desc: 'Business info, booking policy, notifications and advanced controls.', building: true },
	events: { icon: 'calendar', desc: 'Fixed sessions and group attendance are a later domain.', reserved: 'Premium' },
	'shared-assets': { icon: 'box', desc: 'Rooms, equipment and shared capacity are a later premium module.', reserved: 'Premium' },
};

export function Placeholder( { route, title, onNavigate } ) {
	const meta = COPY[ route ] || { icon: 'box', desc: '', building: true };
	return (
		<div className="pd-page">
			<PageHeader title={ title } description={ meta.desc } />
			<section className="pd-card pd-placeholder">
				<div className="pd-placeholder-inner">
					<span className="pd-placeholder-icon">{ renderIcon( meta.icon ) }</span>
					{ meta.reserved ? (
						<>
							<h2>{ title } · { meta.reserved }</h2>
							<p>Reserved for a later release. There is nothing to set up here yet.</p>
						</>
					) : (
						<>
							<h2>{ title } is coming soon</h2>
							<p>This surface is part of the Aponto admin and is being built.</p>
						</>
					) }
					<button className="pd-button" type="button" onClick={ () => onNavigate( 'dashboard' ) }>Back to Dashboard</button>
				</div>
			</section>
		</div>
	);
}
