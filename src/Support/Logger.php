<?php
/**
 * Privacy-safe structured debug logger.
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
 * Writes newline-delimited JSON to an unguessable uploads directory (§8.3).
 *
 * Apache is denied by the generated .htaccess file. Nginx does not read .htaccess, so the
 * persisted random directory/file names are the primary protection there; deployments should
 * additionally deny `location ~* /aponto-logs-` as documented in docs/privacy-inventory.md.
 * Raw requests, customer records and notification templates/payloads must never be passed here.
 */
final class Logger {

	/** Persisted random path and enable timestamp (autoload disabled). */
	public const OPTION = 'aponto_logger_state';

	/** Three 5 MiB generations: current, .1 and .2. */
	public const MAX_BYTES = 5242880;

	/** Debug logging expires after 72 hours. */
	public const MAX_AGE = 259200;

	/**
	 * Supported severity values.
	 *
	 * @var list<string>
	 */
	private const SEVERITIES = array( 'info', 'notice', 'warning', 'error' );

	/**
	 * Context allow-list per operational code. Registry REST codes default to no context until a
	 * reviewed emitter explicitly adds safe keys here.
	 *
	 * @var array<string, list<string>>
	 */
	private const CONTEXT_KEYS = array(
		'aponto_duplicate_module_provider'   => array( 'module_code', 'owner', 'rejected' ),
		'aponto_reservation_anomaly'         => array( 'anomaly', 'booking_id', 'order_id' ),
		'aponto_migration_failed'            => array( 'migration', 'last_good_version' ),
		'aponto_notification_send_failed'    => array( 'delivery_id', 'reason' ),
		'aponto_service_unavailable'         => array(),
		'aponto_integration_failed'          => array( 'module_code', 'scope', 'staff_id' ),
		// Payments (D-R38). The allow-list is deliberately narrow: no amount, no currency, no
		// customer reference, no gateway reference and above all no provider message — a payment
		// error string is the single most likely place for a key fragment or a customer's own data
		// to end up in a log file.
		'aponto_payment_failed'              => array( 'gateway', 'order_id', 'code', 'kind' ),
		'aponto_payment_anomaly'             => array( 'gateway', 'order_id', 'code', 'kind' ),
		// The manage-token derivation secret was replaced because it no longer opened (D-R39d). One
		// key only, and a closed vocabulary: nothing about the secret, the key or any booking.
		'aponto_manage_token_secret_rotated' => array( 'reason' ),
	);

	/**
	 * Per-request identifier shared by every Logger instance.
	 *
	 * @var string|null
	 */
	private static ?string $request_correlation_id = null;

	/**
	 * State reader.
	 *
	 * @var callable():array<string, mixed>
	 */
	private $read_state;

	/**
	 * State writer.
	 *
	 * @var callable(array<string, mixed>):void
	 */
	private $write_state;

	/**
	 * Enabled-state reader.
	 *
	 * @var callable():bool
	 */
	private $enabled;

	/**
	 * Disable callback.
	 *
	 * @var callable():void
	 */
	private $disable;

	/**
	 * Construct the logger.
	 *
	 * @param Settings|null                            $settings    WordPress settings; null with test callbacks.
	 * @param Clock                                    $clock       Injectable clock.
	 * @param string|null                              $uploads_dir Uploads base override.
	 * @param callable():array<string, mixed>|null     $read_state  Test state reader.
	 * @param callable(array<string, mixed>):void|null $write_state Test state writer.
	 * @param callable():bool|null                     $enabled     Test enable reader.
	 * @param callable():void|null                     $disable     Test disable callback.
	 */
	public function __construct(
		?Settings $settings,
		private Clock $clock,
		?string $uploads_dir = null,
		?callable $read_state = null,
		?callable $write_state = null,
		?callable $enabled = null,
		?callable $disable = null
	) {
		$this->uploads_dir = $uploads_dir ?? self::wordpressUploadsDir();
		$this->read_state  = $read_state ?? static function (): array {
			$value = get_option( self::OPTION, array() );
			return is_array( $value ) ? $value : array();
		};
		$this->write_state = $write_state ?? static function ( array $state ): void {
			update_option( self::OPTION, $state, false );
		};
		$this->enabled     = $enabled ?? static fn (): bool => null !== $settings && (bool) $settings->get( 'debug_log' );
		$this->disable     = $disable ?? static function () use ( $settings ): void {
			if ( null !== $settings ) {
				$settings->update( 'debug_log', false );
			}
		};
	}

	/**
	 * Uploads base directory.
	 *
	 * @var string
	 */
	private string $uploads_dir;

	/**
	 * Persist the exact enable instant. Called by Settings on false -> true.
	 *
	 * @param Clock $clock Injectable clock.
	 */
	public static function markEnabled( Clock $clock ): void {
		$state               = get_option( self::OPTION, array() );
		$state               = is_array( $state ) ? $state : array();
		$state['enabled_at'] = $clock->now()->getTimestamp();
		update_option( self::OPTION, $state, false );
	}

	/**
	 * Structured write. The stable English message and all nested context are redacted first.
	 *
	 * @param string               $code     Stable machine code.
	 * @param string               $severity info|notice|warning|error.
	 * @param string               $message  Stable English server-log message.
	 * @param array<string, mixed> $context  Small allow-listed diagnostic context.
	 */
	public function log( string $code, string $severity, string $message, array $context = array() ): bool {
		if ( ! in_array( $severity, self::SEVERITIES, true ) || 1 !== preg_match( '/^aponto_[a-z0-9_]+$/', $code ) ) {
			return false;
		}
		if ( ! ( $this->enabled )() || $this->disableIfExpired() ) {
			return false;
		}

		$path = $this->ensurePath();
		if ( null === $path ) {
			return false;
		}

		$record = array(
			'code'           => $code,
			'severity'       => $severity,
			'correlation_id' => self::correlationId(),
			'message'        => self::redactString( $message ),
			'context'        => self::redactContext( $this->allowedContext( $code, $context ) ),
		);
		if ( function_exists( 'wp_json_encode' ) ) {
			$json = wp_json_encode( $record );
		} else {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- Unit-only fallback when WordPress is absent.
			$json = json_encode( $record );
		}
		if ( ! is_string( $json ) ) {
			return false;
		}

		$this->rotateIfNeeded( $path, strlen( $json ) + 1 );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- Private append-only diagnostic file; WP_Filesystem has no safe atomic append.
		return false !== file_put_contents( $path, $json . "\n", FILE_APPEND | LOCK_EX );
	}

	/**
	 * Cron/on-write expiry check. Returns true when logging is expired and has been disabled.
	 */
	public function disableIfExpired(): bool {
		if ( ! ( $this->enabled )() ) {
			return false;
		}
		$state      = ( $this->read_state )();
		$enabled_at = isset( $state['enabled_at'] ) ? (int) $state['enabled_at'] : 0;
		if ( 0 === $enabled_at ) {
			$state['enabled_at'] = $this->clock->now()->getTimestamp();
			( $this->write_state )( $state );
			return false;
		}
		if ( $this->clock->now()->getTimestamp() - $enabled_at < self::MAX_AGE ) {
			return false;
		}

		( $this->disable )();
		$state['enabled_at'] = 0;
		( $this->write_state )( $state );
		return true;
	}

	/** Current log contents for the capability-gated download endpoint. */
	public function contents(): ?string {
		$path = $this->existingPath();
		if ( null === $path || ! is_readable( $path ) ) {
			return null;
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local private log download.
		$value = file_get_contents( $path );
		return false === $value ? null : $value;
	}

	/**
	 * Redact sensitive values recursively, including keys that designate forbidden payloads.
	 *
	 * @param array<string, mixed> $context Context to redact.
	 * @return array<string, mixed>
	 */
	public static function redactContext( array $context ): array {
		$clean = array();
		foreach ( $context as $key => $value ) {
			$name = (string) $key;
			if ( 1 === preg_match( '/(?:email|phone|token|body|request|customer|template|payload|secret|authorization|idempotency)/i', $name ) ) {
				$clean[ $key ] = '[REDACTED]';
			} elseif ( is_array( $value ) ) {
				$clean[ $key ] = self::redactContext( $value );
			} elseif ( is_string( $value ) ) {
				$clean[ $key ] = self::redactString( $value );
			} elseif ( is_scalar( $value ) || null === $value ) {
				$clean[ $key ] = $value;
			} else {
				$clean[ $key ] = '[REDACTED]';
			}
		}
		return $clean;
	}

	/**
	 * Redact email, phone, bearer/JWT/token and labelled body text in a message.
	 *
	 * @param string $value Text to redact.
	 */
	public static function redactString( string $value ): string {
		$value = (string) preg_replace( '/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i', '[REDACTED]', $value );
		$value = (string) preg_replace( '/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/i', 'Bearer [REDACTED]', $value );
		$value = (string) preg_replace( '/\b(?:token|idempotency(?:_key)?|body)\s*[:=]\s*\S+/i', '$1=[REDACTED]', $value );
		$value = (string) preg_replace_callback(
			'/(?<![A-Za-z0-9])\+?\d[\d\s().\-]{5,}\d/',
			static function ( array $matches ): string {
				return strlen( (string) preg_replace( '/\D/', '', $matches[0] ) ) >= 7 ? '[REDACTED]' : $matches[0];
			},
			$value
		);
		return $value;
	}

	/**
	 * Drop every context field not explicitly approved for this stable code.
	 *
	 * @param string               $code    Stable log code.
	 * @param array<string, mixed> $context Candidate context.
	 * @return array<string, mixed>
	 */
	private function allowedContext( string $code, array $context ): array {
		$keys = self::CONTEXT_KEYS[ $code ] ?? array();
		return array_intersect_key( $context, array_fill_keys( $keys, true ) );
	}

	/** Existing path, validating the persisted random components before use. */
	private function existingPath(): ?string {
		if ( '' === $this->uploads_dir ) {
			return null;
		}
		$state = ( $this->read_state )();
		if ( ! isset( $state['directory'], $state['file'] ) ||
			1 !== preg_match( '/^[a-f0-9]{16}$/', (string) $state['directory'] ) ||
			1 !== preg_match( '/^[a-f0-9]{8}$/', (string) $state['file'] ) ) {
			return null;
		}
		return rtrim( $this->uploads_dir, '/\\' ) . '/aponto-logs-' . $state['directory'] . '/aponto-' . $state['file'] . '.log';
	}

	/** Create the protected random path on the first enabled write. */
	private function ensurePath(): ?string {
		$state = ( $this->read_state )();
		if ( ! isset( $state['directory'], $state['file'] ) ) {
			$state['directory'] = bin2hex( random_bytes( 8 ) );
			$state['file']      = bin2hex( random_bytes( 4 ) );
			( $this->write_state )( $state );
		}
		$path = $this->existingPath();
		if ( null === $path ) {
			return null;
		}
		$directory = dirname( $path );
		if ( ! is_dir( $directory ) ) {
			$created = function_exists( 'wp_mkdir_p' )
				? wp_mkdir_p( $directory )
				// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_mkdir -- Unit-safe fallback; production uses wp_mkdir_p().
				: mkdir( $directory, 0700, true );
			if ( ! $created ) {
				return null;
			}
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- Protection files must exist before the first log write.
		file_put_contents( $directory . '/.htaccess', "Deny from all\n" );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- Empty directory index protection.
		file_put_contents( $directory . '/index.html', '' );
		return $path;
	}

	/**
	 * Rotate before a write that would cross 5 MiB, retaining three generations total.
	 *
	 * @param string $path           Current log path.
	 * @param int    $incoming_bytes Incoming record size.
	 */
	private function rotateIfNeeded( string $path, int $incoming_bytes ): void {
		$size = is_file( $path ) ? filesize( $path ) : 0;
		if ( false === $size || $size + $incoming_bytes <= self::MAX_BYTES ) {
			return;
		}
		if ( is_file( $path . '.2' ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.unlink_unlink -- Rotation of the private local log.
			unlink( $path . '.2' );
		}
		if ( is_file( $path . '.1' ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.rename_rename -- Atomic local log rotation.
			rename( $path . '.1', $path . '.2' );
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.rename_rename -- Atomic local log rotation.
		rename( $path, $path . '.1' );
	}

	/** Request-local UUID-shaped correlation id. */
	private static function correlationId(): string {
		if ( null === self::$request_correlation_id ) {
			self::$request_correlation_id = function_exists( 'wp_generate_uuid4' )
				? wp_generate_uuid4()
				: sprintf( '%s-%s-%s-%s-%s', bin2hex( random_bytes( 4 ) ), bin2hex( random_bytes( 2 ) ), bin2hex( random_bytes( 2 ) ), bin2hex( random_bytes( 2 ) ), bin2hex( random_bytes( 6 ) ) );
		}
		return self::$request_correlation_id;
	}

	/** WordPress uploads base directory, without exposing it in any response/log context. */
	private static function wordpressUploadsDir(): string {
		$uploads = wp_upload_dir( null, false );
		if ( ! is_array( $uploads ) || ! empty( $uploads['error'] ) || empty( $uploads['basedir'] ) ) {
			return '';
		}

		return (string) $uploads['basedir'];
	}
}
