<?php
/**
 * Notification template store (`aponto_notifications`).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Notification;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * Reads and updates the eleven seeded notification templates (`recipient`/`trigger_event` are
 * server-owned and never written from REST — rest-contract §2.13).
 */
final class TemplateRepository {

	/**
	 * Construct the repository.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function __construct( private \wpdb $wpdb ) {}

	/**
	 * Table name.
	 */
	private function table(): string {
		return $this->wpdb->prefix . 'aponto_notifications';
	}

	/**
	 * All templates ordered by id.
	 *
	 * @return list<array<string, mixed>>
	 */
	public function all(): array {
		$table = $this->table();
		$sql   = "SELECT id, template_key, recipient, trigger_event, subject, body, enabled FROM {$table} ORDER BY id ASC";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; no user input.
		$rows = $this->wpdb->get_results( $sql, ARRAY_A );

		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * A single template by key.
	 *
	 * @param string $template_key Template key.
	 * @return array<string, mixed>|null
	 */
	public function find( string $template_key ): ?array {
		$table = $this->table();
		$sql   = "SELECT id, template_key, recipient, trigger_event, subject, body, enabled FROM {$table} WHERE template_key = %s";
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Constant table; bound via prepare().
		$row = $this->wpdb->get_row( $this->wpdb->prepare( $sql, $template_key ), ARRAY_A );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Update a template's editable fields.
	 *
	 * @param string $template_key Template key.
	 * @param string $subject      Subject.
	 * @param string $body         Body.
	 * @param bool   $enabled      Whether enabled.
	 */
	public function update( string $template_key, string $subject, string $body, bool $enabled ): void {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Admin template update.
		$this->wpdb->update(
			$this->table(),
			array(
				'subject' => $subject,
				'body'    => $body,
				'enabled' => $enabled ? 1 : 0,
			),
			array( 'template_key' => $template_key ),
			array( '%s', '%s', '%d' ),
			array( '%s' )
		);
	}
}
