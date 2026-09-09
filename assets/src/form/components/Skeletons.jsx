/** @jsxImportSource preact */
/**
 * Loading skeletons — "shaped like the thing that's coming", never a spinner
 * (design §4). One for the service catalogue, one for the calendar + slots.
 */

function Bar( { w, h, mb } ) {
	return (
		<div
			class="ap-sk"
			style={ {
				width: w || '100%',
				height: ( h || 12 ) + 'px',
				marginBottom: ( mb || 0 ) + 'px',
			} }
		/>
	);
}

export function ServiceSkeleton() {
	return (
		<div aria-hidden="true">
			<Bar h={ 40 } mb={ 12 } />
			<div
				style={ {
					border: '1px solid var(--ap-color-border)',
					borderRadius: 'var(--ap-radius-control)',
					padding: '0 14px',
				} }
			>
				{ [ 32, 40, 28 ].map( ( pct, i ) => (
					<div class="ap-sk-row" key={ i }>
						<div style={ { flex: 1 } }>
							<Bar w={ pct + '%' } h={ 12 } mb={ 6 } />
							<Bar w={ '60%' } h={ 9 } />
						</div>
						<Bar w={ '82px' } h={ 9 } />
					</div>
				) ) }
			</div>
		</div>
	);
}

export function CalendarSkeleton() {
	return (
		<div aria-hidden="true">
			<div
				style={ {
					display: 'flex',
					justifyContent: 'space-between',
					marginBottom: '10px',
				} }
			>
				<Bar w={ '100px' } h={ 20 } />
				<Bar w={ '64px' } h={ 28 } />
			</div>
			<Bar h={ 26 } mb={ 6 } />
			<div
				style={ {
					display: 'grid',
					gridTemplateColumns: 'repeat(7, 1fr)',
					gap: '3px',
				} }
			>
				{ Array.from( { length: 21 } ).map( ( _, i ) => (
					<Bar key={ i } h={ 34 } />
				) ) }
			</div>
		</div>
	);
}

export function SlotsSkeleton() {
	return (
		<div class="ap-slots" aria-hidden="true">
			{ Array.from( { length: 8 } ).map( ( _, i ) => (
				<Bar key={ i } h={ 34 } />
			) ) }
		</div>
	);
}
