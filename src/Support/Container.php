<?php
/**
 * Minimal service container.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Support;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Tiny lazy service container.
 *
 * Factories are resolved once and memoised. Intentionally small — the plugin wires a handful
 * of services; no auto-wiring or reflection.
 */
final class Container {

	/**
	 * Registered factories keyed by service id.
	 *
	 * @var array<string, callable(self):mixed>
	 */
	private array $factories = array();

	/**
	 * Resolved singletons keyed by service id.
	 *
	 * @var array<string, mixed>
	 */
	private array $resolved = array();

	/**
	 * Register a lazy factory for a service id.
	 *
	 * @param string               $id      Service id (usually a class/interface name).
	 * @param callable(self):mixed $factory Factory invoked with the container.
	 */
	public function bind( string $id, callable $factory ): void {
		$this->factories[ $id ] = $factory;
		unset( $this->resolved[ $id ] );
	}

	/**
	 * Store an already-built instance under a service id.
	 *
	 * @param string $id       Service id.
	 * @param mixed  $instance Concrete instance.
	 */
	public function instance( string $id, mixed $instance ): void {
		$this->resolved[ $id ] = $instance;
	}

	/**
	 * Whether a service id is known (bound or resolved).
	 *
	 * @param string $id Service id.
	 */
	public function has( string $id ): bool {
		return isset( $this->factories[ $id ] ) || array_key_exists( $id, $this->resolved );
	}

	/**
	 * Resolve a service, building and memoising it on first access.
	 *
	 * @param string $id Service id.
	 * @return mixed
	 * @throws \RuntimeException When the id is not registered.
	 */
	public function get( string $id ): mixed {
		if ( array_key_exists( $id, $this->resolved ) ) {
			return $this->resolved[ $id ];
		}

		if ( ! isset( $this->factories[ $id ] ) ) {
			throw new \RuntimeException( esc_html( sprintf( 'Aponto\\Support\\Container: unknown service "%s".', $id ) ) );
		}

		$this->resolved[ $id ] = ( $this->factories[ $id ] )( $this );

		return $this->resolved[ $id ];
	}
}
