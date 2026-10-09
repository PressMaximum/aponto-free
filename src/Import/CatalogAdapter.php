<?php
/**
 * Service and staff CSV import through their shared domain gateways.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Import;

use Aponto\Rest\Args;
use Aponto\Rest\Data\ServiceGateway;
use Aponto\Rest\Data\StaffGateway;
use Aponto\Rest\Errors;
use Aponto\Rest\RequestValidator;
use Aponto\Support\PersonName;
use Aponto\Support\Settings;

/** Catalog entities use source IDs or explicit local bindings, never name matching. */
class CatalogAdapter extends IdentityAdapter {
	/**
	 * Resolve validated import data.
	 *
	 * @param array<string,string> $values Values.
	 * @return array<string,mixed>|\WP_Error Validated data.
	 */
	public function data( array $values ): array|\WP_Error {
		$v = new RequestValidator();
		if ( 'staff' === $this->entity ) {
			$data = array(
				'first_name' => $v->namePart( 'first_name', $values['first_name'] ?? '', 'first' ),
				'last_name'  => $v->namePart( 'last_name', $values['last_name'] ?? '', 'last', false ),
				'email'      => $v->email( 'email', $values['email'] ?? '' ),
				'phone'      => $v->phone( 'phone', $values['phone'] ?? '' ),
				'type'       => $v->enum( 'type', $this->defaultValue( $values, 'type', 'human' ), array( 'human', 'resource' ) ),
				'status'     => $v->enum( 'status', $this->defaultValue( $values, 'status', 'active' ), array( 'active', 'archived' ) ),
				'title'      => $v->boundedText( 'title', $values['title'] ?? '', 191 ),
				'bio'        => $v->boundedText( 'bio', $values['bio'] ?? '', 600, true ),
				'is_public'  => (int) $v->enum( 'is_public', $this->defaultValue( $values, 'is_public', '1' ), array( '0', '1' ) ),
			);
		} else {
			$data = array(
				'name'              => $v->name( 'name', $values['name'] ?? '' ),
				'description'       => $v->text( $values['description'] ?? '' ),
				'color'             => $v->hexColor( 'color', $values['color'] ?? '' ),
				'duration_minutes'  => $v->intInRange( 'duration_minutes', $values['duration_minutes'] ?? '', 5, 480, 5 ),
				'buffer_before'     => $v->intInRange( 'buffer_before', $this->defaultValue( $values, 'buffer_before', '0' ), 0, 120 ),
				'buffer_after'      => $v->intInRange( 'buffer_after', $this->defaultValue( $values, 'buffer_after', '0' ), 0, 120 ),
				'slot_step_minutes' => $v->nullableInt( 'slot_step_minutes', $values['slot_step_minutes'] ?? null, 5, 480 ),
				'price_minor'       => $v->nullableInt( 'price_minor', $values['price_minor'] ?? null, 0, Args::MAX_PRICE_MINOR ),
				'min_lead_minutes'  => $v->nullableInt( 'min_lead_minutes', $values['min_lead_minutes'] ?? null, 0, Args::MAX_INT_UNSIGNED ),
				'max_horizon_days'  => $v->nullableInt( 'max_horizon_days', $values['max_horizon_days'] ?? null, 1, Args::MAX_SMALLINT_UNSIGNED ),
				'status'            => $v->enum( 'status', $this->defaultValue( $values, 'status', 'active' ), array( 'active', 'draft', 'archived' ) ),
				'capacity'          => 1,
				'position'          => 0,
			);
			if ( '' !== ( $values['currency'] ?? '' ) && strtoupper( trim( $values['currency'] ) ) !== ( new Settings() )->get( 'currency' ) ) {
				$v->fail( 'currency', __( 'Service prices must use the site currency. Convert the amount before importing.', 'aponto' ) );
			}
		}
		if ( isset( $values['position'] ) && '' !== $values['position'] ) {
			$data['position'] = $v->intInRange( 'position', $values['position'], 0, Args::MAX_INT_UNSIGNED );
		}
		return $v->failed() ? Errors::validation( $v->errors() ) : $data;
	}

	/**
	 * Resolve validated import data.
	 *
	 * @param int $id ID.
	 * @return array<string,mixed>|null Row.
	 */
	protected function find( int $id ): ?array {
		return 'staff' === $this->entity ? ( new StaffGateway( $this->wpdb, $this->clock ) )->find( $id ) : ( new ServiceGateway( $this->wpdb, $this->clock ) )->find( $id );
	}

	/**
	 * Resolve validated import data.
	 *
	 * @param array<string,mixed> $data Data.
	 */
	protected function create( array $data ): int {
		if ( 'staff' === $this->entity ) {
			$gateway          = new StaffGateway( $this->wpdb, $this->clock );
			$data['position'] = $data['position'] ?? $gateway->maxPosition() + 1;
			$this->assertRead();
			return $gateway->create( $data, false );
		}
		return ( new ServiceGateway( $this->wpdb, $this->clock ) )->create( $data, false );
	}

	/**
	 * Resolve validated import data.
	 *
	 * @param array<string,mixed> $row Row.
	 * @return list<array{hook:string,args:array<mixed>}> Events.
	 */
	protected function events( array $row ): array {
		$kind = 'staff' === $this->entity ? 'staff' : 'service';
		$row  = 'staff' === $this->entity ? PersonName::withDisplayName( $row ) : $row;
		return array(
			array(
				'hook' => 'aponto_' . $kind . '_created',
				'args' => array( (int) $row['id'], $row ),
			),
			array(
				'hook' => 'aponto_' . $kind . '_creation_committed',
				'args' => array( $row ),
			),
		);
	}

	/**
	 * Resolve validated import data.
	 *
	 * @param array<string,string> $values Values.
	 * @param string               $key Key.
	 * @param string               $fallback Default.
	 */
	private function defaultValue( array $values, string $key, string $fallback ): string {
		return '' === ( $values[ $key ] ?? '' ) ? $fallback : $values[ $key ];
	}
}
