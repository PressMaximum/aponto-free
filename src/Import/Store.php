<?php
/**
 * Site-scoped sources, immutable identity bindings and encrypted jobs (D-R72).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Import;

use Aponto\Database\StorageException;
use Aponto\Support\Clock;
use Aponto\Support\Crypto;
use Aponto\Support\ModuleSecrets;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Private table identifiers use %i and every value is prepared. No cache for authoritative import progress.
/** Persistence only; callers own locks and transactions for mutations. */
final class Store {
	/**
	 * Construct site storage.
	 *
	 * @param \wpdb $wpdb Database.
	 * @param Clock $clock Injectable clock.
	 */
	public function __construct( private \wpdb $wpdb, private Clock $clock ) {}

	/**
	 * Read the declared result.
	 *
	 * @return list<array{id:string,label:string}> Available source namespaces. */
	public function sources(): array {
		$rows = $this->wpdb->get_results( $this->wpdb->prepare( 'SELECT id, label FROM %i ORDER BY created_at, id LIMIT %d', $this->wpdb->prefix . 'aponto_import_sources', 1000 ), ARRAY_A );
		$this->assertRead();
		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Read a source by UUID, never by label.
	 *
	 * @param string $id Source UUID.
	 * @return array{id:string,label:string}|null Source.
	 */
	public function source( string $id ): ?array {
		$row = $this->wpdb->get_row( $this->wpdb->prepare( 'SELECT id, label FROM %i WHERE id = %s', $this->wpdb->prefix . 'aponto_import_sources', $id ), ARRAY_A );
		$this->assertRead();
		return is_array( $row ) ? $row : null;
	}

	/**
	 * Persist a reserved source once execution is authorized.
	 *
	 * @param array{id:string,label:string} $source Source namespace.
	 */
	public function ensureSource( array $source ): void {
		$this->write( $this->wpdb->prepare( 'INSERT IGNORE INTO %i (id,label,created_at) VALUES (%s,%s,%s)', $this->wpdb->prefix . 'aponto_import_sources', $source['id'], $source['label'], $this->clock->nowSql() ) );
	}

	/**
	 * Resolve an exact external identifier, preserving case and leading zeros.
	 *
	 * @param string $source Source UUID.
	 * @param string $entity Entity namespace.
	 * @param string $external Exact external ID.
	 */
	public function resolve( string $source, string $entity, string $external ): ?int {
		$id = $this->wpdb->get_var( $this->wpdb->prepare( 'SELECT target_id FROM %i WHERE source_id = %s AND entity = %s AND external_hash = %s', $this->wpdb->prefix . 'aponto_import_ids', $source, $entity, hash( 'sha256', $external ) ) );
		$this->assertRead();
		return null === $id ? null : (int) $id;
	}

	/**
	 * Bind immutably. A conflicting existing mapping is never replaced.
	 *
	 * @param string $source Source UUID.
	 * @param string $entity Entity namespace.
	 * @param string $external Exact external ID.
	 * @param int    $target Local primary key.
	 * @throws \RuntimeException On conflicting binding.
	 */
	public function bind( string $source, string $entity, string $external, int $target ): void {
		$this->write( $this->wpdb->prepare( 'INSERT IGNORE INTO %i (source_id,entity,external_hash,target_id,created_at) VALUES (%s,%s,%s,%d,%s)', $this->wpdb->prefix . 'aponto_import_ids', $source, $entity, hash( 'sha256', $external ), $target, $this->clock->nowSql() ) );
		if ( $target !== $this->resolve( $source, $entity, $external ) ) {
			throw new \RuntimeException( 'Import identity changed.' );
		}
	}

	/**
	 * Persist a new encrypted job. Caller enforces the per-owner limit under the import lock.
	 *
	 * @param array<string,mixed> $job Job.
	 * @param int                 $owner WordPress user ID.
	 */
	public function createJob( array $job, int $owner ): void {
		$this->write( $this->wpdb->prepare( 'INSERT INTO %i (id,owner_id,payload,expires_at) VALUES (%s,%d,%s,%s)', $this->wpdb->prefix . 'aponto_import_jobs', $job['id'], $owner, $this->seal( $job, $owner ), $job['expires_at'] ) );
	}


	/**
	 * Clear derived validation parts under the caller's job transaction.
	 *
	 * @param string $id Owned job ID.
	 * @param int    $owner Authenticated owner.
	 */
	public function clearPreparedParts( string $id, int $owner ): void {
		$this->write(
			$this->wpdb->prepare(
				'DELETE FROM %i WHERE job_id IN (SELECT id FROM %i WHERE id = %s AND owner_id = %d AND expires_at > %s) AND part_key NOT LIKE %s',
				$this->wpdb->prefix . 'aponto_import_parts',
				$this->wpdb->prefix . 'aponto_import_jobs',
				$id,
				$owner,
				$this->clock->nowSql(),
				'raw:%'
			)
		);
	}

	/**
	 * Store one encrypted upload chunk, normalized row, or duplicate identity marker.
	 *
	 * The parent ownership and expiry guard is part of the INSERT, not a separate
	 * authorization read. Callers own the import lock and transaction; this method
	 * never commits independently of job progress or the privacy epoch check.
	 *
	 * @param string              $id Job UUID.
	 * @param int                 $owner Owner ID.
	 * @param string              $key Strict ASCII part key.
	 * @param array<string,mixed> $value Part payload.
	 * @param string              $expires_at UTC SQL expiry, no later than the parent expiry.
	 * @throws \RuntimeException When no owned, live parent accepted the part; key validation can also throw InvalidArgumentException.
	 */
	public function putPart( string $id, int $owner, string $key, array $value, string $expires_at ): void {
		$this->assertPartKey( $key );
		$payload = $this->crypto()->encrypt( (string) wp_json_encode( $value, JSON_THROW_ON_ERROR ), 'aponto-import-part', $this->context( $id, $owner ) . '|' . $key );
		$now     = $this->clock->nowSql();
		$count   = $this->write(
			$this->wpdb->prepare(
				'INSERT INTO %i (job_id,part_key,payload,expires_at) SELECT j.id,%s,%s,%s FROM %i j WHERE j.id = %s AND j.owner_id = %d AND j.expires_at > %s AND j.expires_at >= %s AND %s > %s ON DUPLICATE KEY UPDATE payload = VALUES(payload), expires_at = VALUES(expires_at)',
				$this->wpdb->prefix . 'aponto_import_parts',
				$key,
				$payload,
				$expires_at,
				$this->wpdb->prefix . 'aponto_import_jobs',
				$id,
				$owner,
				$now,
				$expires_at,
				$expires_at,
				$now
			)
		);
		// Encryption uses a fresh nonce, so a legitimate replacement changes its ciphertext.
		// MySQL reports 2 for the update branch; SQLite reports 1. Zero means no parent matched.
		if ( $count < 1 ) {
			throw new \RuntimeException( 'Import part parent is missing, expired or not owned.' );
		}
	}

	/**
	 * Read one part only through its owned, unexpired parent.
	 *
	 * @param string $id Job UUID.
	 * @param int    $owner Owner ID.
	 * @param string $key Strict ASCII part key.
	 * @return array<string,mixed>|null Decoded part, or null when not accessible.
	 * @throws \InvalidArgumentException On an unsupported part key.
	 * @throws \RuntimeException On unreadable or substituted ciphertext.
	 */
	public function part( string $id, int $owner, string $key ): ?array {
		$this->assertPartKey( $key );
		$now = $this->clock->nowSql();
		$row = $this->wpdb->get_row(
			$this->wpdb->prepare(
				'SELECT p.payload FROM %i p INNER JOIN %i j ON j.id = p.job_id WHERE p.job_id = %s AND p.part_key = %s AND j.owner_id = %d AND j.expires_at > %s AND p.expires_at > %s',
				$this->wpdb->prefix . 'aponto_import_parts',
				$this->wpdb->prefix . 'aponto_import_jobs',
				$id,
				$key,
				$owner,
				$now,
				$now
			),
			ARRAY_A
		);
		$this->assertRead();
		return is_array( $row ) ? $this->openPart( $id, $owner, $key, (string) $row['payload'] ) : null;
	}

	/**
	 * Read a bounded row-key range in logical CSV order.
	 *
	 * Start is the inclusive numeric key index; callers may choose zero- or one-based
	 * row indices consistently. Missing keys are never shifted into the requested range.
	 *
	 * @param string $id Job UUID.
	 * @param int    $owner Owner ID.
	 * @param int    $start Inclusive row index.
	 * @param int    $limit Maximum range size, 1 through 1000.
	 * @return list<array<string,mixed>> Decoded rows in ascending key order.
	 * @throws \InvalidArgumentException On an invalid range; unreadable ciphertext raises RuntimeException.
	 */
	public function rowPage( string $id, int $owner, int $start, int $limit ): array {
		if ( $start < 0 || $limit < 1 || $limit > 1000 || $start > 99999999 - $limit ) {
			throw new \InvalidArgumentException( 'Import row range is invalid.' );
		}
		$now  = $this->clock->nowSql();
		$rows = $this->wpdb->get_results(
			$this->wpdb->prepare(
				'SELECT p.part_key,p.payload FROM %i p INNER JOIN %i j ON j.id = p.job_id WHERE p.job_id = %s AND j.owner_id = %d AND j.expires_at > %s AND p.expires_at > %s AND p.part_key >= %s AND p.part_key < %s ORDER BY p.part_key ASC LIMIT %d',
				$this->wpdb->prefix . 'aponto_import_parts',
				$this->wpdb->prefix . 'aponto_import_jobs',
				$id,
				$owner,
				$now,
				$now,
				sprintf( 'row:%08d', $start ),
				sprintf( 'row:%08d', $start + $limit ),
				$limit
			),
			ARRAY_A
		);
		$this->assertRead();
		$out = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$out[] = $this->openPart( $id, $owner, (string) $row['part_key'], (string) $row['payload'] );
		}
		return $out;
	}

	/**
	 * Count unexpired jobs for an owner.
	 *
	 * @param int $owner WordPress user ID.
	 */
	public function jobCount( int $owner ): int {
		$count = $this->wpdb->get_var( $this->wpdb->prepare( 'SELECT COUNT(*) FROM %i WHERE owner_id = %d AND expires_at > %s', $this->wpdb->prefix . 'aponto_import_jobs', $owner, $this->clock->nowSql() ) );
		$this->assertRead();
		return (int) $count;
	}

	/**
	 * Load only an owned, unexpired job. No PII is returned on wrong ownership.
	 *
	 * @param string $id Job UUID.
	 * @param int    $owner WordPress user ID.
	 * @return array<string,mixed>|null Job.
	 * @throws \RuntimeException On unreadable ciphertext.
	 */
	public function job( string $id, int $owner ): ?array {
		$row = $this->wpdb->get_row( $this->wpdb->prepare( 'SELECT payload FROM %i WHERE id = %s AND owner_id = %d AND expires_at > %s', $this->wpdb->prefix . 'aponto_import_jobs', $id, $owner, $this->clock->nowSql() ), ARRAY_A );
		$this->assertRead();
		if ( ! is_array( $row ) ) {
			return null;
		}
		$plain = $this->crypto()->decrypt( (string) $row['payload'], 'aponto-import', $this->context( $id, $owner ) );
		$job   = null === $plain ? null : json_decode( $plain, true );
		if ( ! is_array( $job ) || ( $job['id'] ?? null ) !== $id ) {
			throw new \RuntimeException( 'Import job cannot be decrypted.' );
		}
		return $job;
	}

	/**
	 * Store progress in the SAME transaction as imported records and identities.
	 *
	 * @param array<string,mixed> $job Job.
	 * @param int                 $owner Owner ID.
	 * @throws \RuntimeException If the job disappeared during execution.
	 */
	public function saveJob( array $job, int $owner ): void {
		$count = $this->write( $this->wpdb->prepare( 'UPDATE %i SET payload = %s WHERE id = %s AND owner_id = %d', $this->wpdb->prefix . 'aponto_import_jobs', $this->seal( $job, $owner ), $job['id'], $owner ) );
		if ( 1 !== $count ) {
			throw new \RuntimeException( 'Import job disappeared.' );
		}
	}

	/**
	 * Delete job/report, never business records.
	 *
	 * @param string $id Job UUID.
	 * @param int    $owner Owner ID.
	 */
	public function deleteJob( string $id, int $owner ): bool {
		$this->write( $this->wpdb->prepare( 'DELETE FROM %i WHERE job_id IN (SELECT id FROM %i WHERE id = %s AND owner_id = %d)', $this->wpdb->prefix . 'aponto_import_parts', $this->wpdb->prefix . 'aponto_import_jobs', $id, $owner ) );
		return $this->write( $this->wpdb->prepare( 'DELETE FROM %i WHERE id = %s AND owner_id = %d', $this->wpdb->prefix . 'aponto_import_jobs', $id, $owner ) ) > 0;
	}

	/** Expired ciphertext is pruned even while the feature is disabled. */
	public function prune(): void {
		$this->write( $this->wpdb->prepare( 'DELETE FROM %i WHERE expires_at <= %s', $this->wpdb->prefix . 'aponto_import_parts', $this->clock->nowSql() ) );
		$this->write( $this->wpdb->prepare( 'DELETE FROM %i WHERE expires_at <= %s', $this->wpdb->prefix . 'aponto_import_jobs', $this->clock->nowSql() ) );
	}

	/**
	 * Erasure clears all short-lived previews to cover not-yet-created identities.
	 * Called inside privacy erasure's transaction, including when no customer exists.
	 *
	 * @param int $customer_id Local customer ID, zero when no persisted customer exists.
	 */
	public function eraseCustomer( int $customer_id ): int {
		$this->privacyEpoch( true );
		$this->write( $this->wpdb->prepare( 'UPDATE %i SET privacy_epoch = %s WHERE id = %d', $this->wpdb->prefix . 'aponto_import_state', wp_generate_uuid4(), 1 ) );
		$removed  = $this->write( $this->wpdb->prepare( 'DELETE FROM %i WHERE entity = %s AND target_id = %d', $this->wpdb->prefix . 'aponto_import_ids', 'customers', $customer_id ) );
		$removed += $this->write( $this->wpdb->prepare( 'DELETE FROM %i WHERE %d = %d', $this->wpdb->prefix . 'aponto_import_parts', 1, 1 ) );
		return $removed + $this->write( $this->wpdb->prepare( 'DELETE FROM %i WHERE owner_id >= %d', $this->wpdb->prefix . 'aponto_import_jobs', 0 ) );
	}

	/**
	 * Purge previews outside an existing transaction (WordPress eraser entry point).
	 *
	 * @throws \Throwable On failure; never roll back a caller-owned transaction.
	 */
	public function purgePreviews(): int {
		$tx = new \Aponto\Database\TransactionGuard( $this->wpdb );
		$tx->beginReadCommitted();
		try {
			$removed = $this->eraseCustomer( 0 );
			$tx->commit();
			return $removed;
		} catch ( \Throwable $failure ) {
			$tx->rollback();
			throw $failure;
		}
	}

	/**
	 * Read the erasure generation. Lock at job creation, before persisting PII.
	 *
	 * @param bool $lock Whether called inside the job/erasure transaction.
	 * @throws \RuntimeException On missing schema seed.
	 */
	public function privacyEpoch( bool $lock = false ): string {
		$sql   = 'SELECT privacy_epoch FROM %i WHERE id = %d' . ( $lock ? ' FOR UPDATE' : '' );
		$epoch = $this->wpdb->get_var( $this->wpdb->prepare( $sql, $this->wpdb->prefix . 'aponto_import_state', 1 ) );
		$this->assertRead();
		if ( ! is_string( $epoch ) || '' === $epoch ) {
			throw new \RuntimeException( 'Import privacy state unavailable.' );
		}
		return $epoch;
	}

	/**
	 * Recoverable owned jobs without exposing contact values in the landing page.
	 *
	 * @param int $owner Acting user.
	 * @return list<array<string,mixed>> Summaries.
	 */
	public function jobs( int $owner ): array {
		$ids = $this->wpdb->get_col( $this->wpdb->prepare( 'SELECT id FROM %i WHERE owner_id = %d AND expires_at > %s ORDER BY expires_at DESC LIMIT %d', $this->wpdb->prefix . 'aponto_import_jobs', $owner, $this->clock->nowSql(), 10 ) );
		$this->assertRead();
		$jobs = array();
		foreach ( $ids as $id ) {
			try {
				$job = $this->job( (string) $id, $owner );
			} catch ( \RuntimeException $failure ) {
				// Salt rotation/corruption must not block the schema or prevent report deletion.
				$job = array(
					'id'     => (string) $id,
					'status' => 'unreadable',
				);
			}
			if ( null !== $job ) {
				$jobs[] = array_intersect_key( $job, array_flip( array( 'id', 'entity', 'filename', 'status', 'source', 'total', 'processed', 'expires_at', 'paged', 'upload_received', 'upload_size', 'validated', 'counts' ) ) );
			}
		}
		return $jobs;
	}

	/**
	 * Encrypt a bounded job, bound to site, owner and UUID.
	 *
	 * @param array<string,mixed> $job Job.
	 * @param int                 $owner Owner ID.
	 */
	private function seal( array $job, int $owner ): string {
		return $this->crypto()->encrypt( (string) wp_json_encode( $job, JSON_THROW_ON_ERROR ), 'aponto-import', $this->context( (string) $job['id'], $owner ) );
	}


	/**
	 * Authenticate a part against its exact site, owner, job and key.
	 *
	 * @param string $id Job UUID.
	 * @param int    $owner Owner ID.
	 * @param string $key Part key.
	 * @param string $payload Ciphertext.
	 * @return array<string,mixed> Decoded payload.
	 * @throws \RuntimeException On unreadable ciphertext or a non-array payload.
	 */
	private function openPart( string $id, int $owner, string $key, string $payload ): array {
		$plain = $this->crypto()->decrypt( $payload, 'aponto-import-part', $this->context( $id, $owner ) . '|' . $key );
		$value = null === $plain ? null : json_decode( $plain, true );
		if ( ! is_array( $value ) ) {
			throw new \RuntimeException( 'Import part cannot be decrypted.' );
		}
		return $value;
	}

	/**
	 * Keep persisted keys ASCII, unambiguous and lexicographically ordered.
	 *
	 * @param string $key Part key.
	 * @throws \InvalidArgumentException On unsupported keys.
	 */
	private function assertPartKey( string $key ): void {
		if ( 1 !== preg_match( '/\A(?:(?:raw|row):[0-9]{8}|(?:identity|catalog):[a-f0-9]{64})\z/', $key ) ) {
			throw new \InvalidArgumentException( 'Import part key is invalid.' );
		}
	}

	/** Site encryption without a serialized runtime dependency. */
	private function crypto(): Crypto {
		return new Crypto( ModuleSecrets::siteKeyMaterial() );
	}

	/**
	 * Context binding includes the site table prefix.
	 *
	 * @param string $id Job UUID.
	 * @param int    $owner Owner ID.
	 */
	private function context( string $id, int $owner ): string {
		return $this->wpdb->prefix . '|' . $owner . '|' . $id;
	}

	/**
	 * Prepared SQL mutation, with immediate error snapshot.
	 *
	 * @param string $sql Prepared query.
	 * @throws StorageException On database error.
	 */
	private function write( string $sql ): int {
		$result = $this->wpdb->query( $sql );
		if ( false === $result ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Stable exception message; raw SQL errors stay in exception properties.
			throw StorageException::fromWpdb( $this->wpdb, 'import write' );
		}
		return $result;
	}

	/**
	 * Fail closed on storage errors.
	 *
	 * @throws StorageException On database read failure. */
	private function assertRead(): void {
		if ( '' !== $this->wpdb->last_error ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Stable exception message; raw SQL errors stay in exception properties.
			throw StorageException::fromWpdb( $this->wpdb, 'import read' );
		}
	}
}
