import { useEffect, useRef, useState } from '@wordpress/element';
import { menuRovingKeydown } from './ui.jsx';

/** The Bookings toolbar select, shared by list filters without alternate styling. */
export function ToolbarSelect({
	label,
	menuLabel = label,
	value,
	options,
	onChange,
	renderIcon,
	icon,
	selectedContent,
	menuFooter,
	disabled = false,
}) {
	const [open, setOpen] = useState(false);
	const root = useRef(null);
	const trigger = useRef(null);
	const close = () => {
		setOpen(false);
		trigger.current?.focus();
	};
	useEffect(() => {
		if (!open) return undefined;
		root.current?.querySelector('[role="menuitemradio"][aria-checked="true"]')?.focus();
		const dismiss = (event) => {
			if (event.type === 'pointerdown') {
				if (!root.current?.contains(event.target)) setOpen(false);
			} else if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				close();
			}
		};
		document.addEventListener('pointerdown', dismiss);
		document.addEventListener('keydown', dismiss, true);
		return () => {
			document.removeEventListener('pointerdown', dismiss);
			document.removeEventListener('keydown', dismiss, true);
		};
	}, [open]);
	return (
		<div className="pd-toolbar-control-group pd-toolbar-date-control">
			<div className="pd-toolbar-popover-wrap" ref={root}>
				<button
					className="pd-toolbar-control"
					type="button"
					ref={trigger}
					aria-label={label}
					aria-haspopup="menu"
					aria-expanded={open}
					disabled={disabled}
					onClick={() => setOpen((previous) => !previous)}
				>
					{icon ? renderIcon(icon) : null}
					<span className="pd-date-range-value">
						{selectedContent ?? options.find((option) => option.value === value)?.label}
					</span>
					{renderIcon('chevronDown')}
				</button>
				{open ? (
					<div
						className="pd-toolbar-popover pd-date-popover"
						role="menu"
						aria-label={menuLabel}
						onKeyDown={menuRovingKeydown}
					>
						{options.map((option) => (
							<button
								type="button"
								role="menuitemradio"
								aria-checked={value === option.value}
								key={option.value}
								disabled={disabled || option.disabled}
								onClick={() => {
									onChange(option.value);
									close();
								}}
							>
								<span>
									<strong>{option.label}</strong>
									{option.detail ? <small>{option.detail}</small> : null}
								</span>
								<span className="pd-toolbar-menu-check">
									{value === option.value ? renderIcon('check') : null}
								</span>
							</button>
						))}
						{menuFooter ? menuFooter({ close }) : null}
					</div>
				) : null}
			</div>
		</div>
	);
}
