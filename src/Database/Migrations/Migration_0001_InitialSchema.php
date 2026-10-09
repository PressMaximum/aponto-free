<?php
/**
 * Migration 0001 — initial schema.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Database\Migrations;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Database\SchemaVerifier;

/**
 * Creates the 19 core tables (§4.2): the 16 reference tables plus the 3 generic meta tables
 * resolved by the orchestrator (extension-surface §8 OQ1).
 *
 * Every statement is dbDelta-compliant (§4.1): two spaces after `PRIMARY KEY`, one KEY per line,
 * lowercase types, no inline comments, `$wpdb->get_charset_collate()` appended, and an explicit
 * `ENGINE=InnoDB` (NB-3). Integer columns carry no display width, matching MySQL 8.0.17+ so the
 * migration is a clean no-op on re-run in the test environment.
 */
final class Migration_0001_InitialSchema implements Migration {

	/**
	 * Table slugs (prefix-less, including the `aponto_` component) created by this migration.
	 *
	 * @return list<string>
	 */
	public static function tableSlugs(): array {
		return array(
			'aponto_locations',
			'aponto_service_categories',
			'aponto_services',
			'aponto_staff',
			'aponto_staff_services',
			'aponto_schedules',
			'aponto_blocked_periods',
			'aponto_customers',
			'aponto_bookings',
			'aponto_orders',
			'aponto_order_items',
			'aponto_notifications',
			'aponto_activities',
			'aponto_idempotency',
			'aponto_notification_deliveries',
			'aponto_rate_counters',
			'aponto_staff_meta',
			'aponto_service_meta',
			'aponto_booking_meta',
		);
	}

	/**
	 * Schema version this migration reaches.
	 */
	public function version(): int {
		return 1;
	}

	/**
	 * Create the 19 tables via dbDelta (idempotent).
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function up( \wpdb $wpdb ): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		foreach ( $this->statements( $wpdb ) as $sql ) {
			dbDelta( $sql );
		}
	}

	/**
	 * Verify the real shape of all 19 tables against this migration's own DDL: existence, InnoDB
	 * engine, every column, primary key and every UNIQUE/plain key. A partially created table
	 * (e.g. missing UNIQUE email_norm) fails verification and blocks the version bump.
	 *
	 * @param \wpdb $wpdb Database handle.
	 */
	public function verify( \wpdb $wpdb ): bool {
		return null === ( new SchemaVerifier( $wpdb ) )->verifyStatements( $this->statements( $wpdb ) );
	}

	/**
	 * Full list of dbDelta-compliant CREATE TABLE statements for this migration.
	 *
	 * Public so verify() and the activation health check derive their expectations from the SAME
	 * DDL — no second, hand-maintained schema list that could drift.
	 *
	 * @param \wpdb $wpdb Database handle (for prefix + charset/collate).
	 * @return list<string>
	 */
	public function statements( \wpdb $wpdb ): array {
		$p  = $wpdb->prefix;
		$cc = $wpdb->get_charset_collate();

		$statements = array();

		$statements[] = "CREATE TABLE {$p}aponto_locations (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	name varchar(191) NOT NULL,
	address_line1 varchar(191) NOT NULL DEFAULT '',
	address_line2 varchar(191) NOT NULL DEFAULT '',
	city varchar(128) NOT NULL DEFAULT '',
	region varchar(128) NOT NULL DEFAULT '',
	postal_code varchar(32) NOT NULL DEFAULT '',
	country varchar(2) NOT NULL DEFAULT '',
	phone varchar(64) NOT NULL DEFAULT '',
	timezone varchar(64) NULL,
	status varchar(20) NOT NULL DEFAULT 'active',
	PRIMARY KEY  (id)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_service_categories (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	name varchar(191) NOT NULL,
	position int NOT NULL DEFAULT 0,
	PRIMARY KEY  (id)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_services (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	category_id bigint unsigned NULL,
	name varchar(191) NOT NULL,
	description text NOT NULL,
	image_id bigint unsigned NULL,
	color varchar(7) NULL,
	duration_minutes smallint unsigned NOT NULL,
	buffer_before smallint unsigned NOT NULL DEFAULT 0,
	buffer_after smallint unsigned NOT NULL DEFAULT 0,
	slot_step_minutes smallint unsigned NULL,
	capacity smallint unsigned NOT NULL DEFAULT 1,
	price_minor int unsigned NULL,
	min_lead_minutes int unsigned NULL,
	max_horizon_days smallint unsigned NULL,
	status varchar(20) NOT NULL DEFAULT 'active',
	position int NOT NULL DEFAULT 0,
	created_at datetime NOT NULL,
	updated_at datetime NOT NULL,
	PRIMARY KEY  (id),
	KEY status_position (status,position),
	KEY category_idx (category_id)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_staff (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	type varchar(20) NOT NULL DEFAULT 'human',
	first_name varchar(191) NOT NULL,
	last_name varchar(191) NOT NULL DEFAULT '',
	email varchar(191) NOT NULL,
	phone varchar(64) NOT NULL DEFAULT '',
	avatar_id bigint unsigned NULL,
	wp_user_id bigint unsigned NULL,
	status varchar(20) NOT NULL DEFAULT 'active',
	position int NOT NULL DEFAULT 0,
	created_at datetime NOT NULL,
	updated_at datetime NOT NULL,
	PRIMARY KEY  (id),
	KEY status_idx (status)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_staff_services (
	staff_id bigint unsigned NOT NULL,
	service_id bigint unsigned NOT NULL,
	location_id bigint unsigned NOT NULL DEFAULT 0,
	PRIMARY KEY  (staff_id,service_id,location_id)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_schedules (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	staff_id bigint unsigned NOT NULL DEFAULT 0,
	service_id bigint unsigned NOT NULL DEFAULT 0,
	location_id bigint unsigned NOT NULL DEFAULT 0,
	weekday tinyint unsigned NOT NULL DEFAULT 0,
	date_override date NULL,
	start_minute smallint unsigned NOT NULL,
	end_minute smallint unsigned NOT NULL,
	PRIMARY KEY  (id),
	KEY staff_weekday (staff_id,weekday),
	KEY date_override_idx (date_override),
	KEY resolver (staff_id,service_id,location_id,weekday)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_blocked_periods (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	staff_id bigint unsigned NOT NULL DEFAULT 0,
	location_id bigint unsigned NOT NULL DEFAULT 0,
	start_datetime_utc datetime NOT NULL,
	end_datetime_utc datetime NOT NULL,
	reason varchar(191) NOT NULL DEFAULT '',
	source varchar(32) NOT NULL DEFAULT 'manual',
	PRIMARY KEY  (id),
	KEY staff_range (staff_id,start_datetime_utc,end_datetime_utc),
	KEY location_range (location_id,start_datetime_utc)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_customers (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	first_name varchar(191) NOT NULL,
	last_name varchar(191) NOT NULL DEFAULT '',
	email varchar(191) NOT NULL,
	email_norm varchar(191) NOT NULL,
	phone varchar(64) NOT NULL DEFAULT '',
	wp_user_id bigint unsigned NULL,
	note text NOT NULL,
	created_at datetime NOT NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY email_norm (email_norm)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_bookings (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	service_id bigint unsigned NOT NULL,
	staff_id bigint unsigned NOT NULL,
	location_id bigint unsigned NOT NULL DEFAULT 0,
	occurrence_id bigint unsigned NULL,
	start_datetime_utc datetime NOT NULL,
	end_datetime_utc datetime NOT NULL,
	local_date date NOT NULL,
	start_minute smallint unsigned NOT NULL,
	end_minute smallint unsigned NOT NULL,
	buffer_before smallint unsigned NOT NULL DEFAULT 0,
	buffer_after smallint unsigned NOT NULL DEFAULT 0,
	status varchar(20) NOT NULL DEFAULT 'pending',
	attendees smallint unsigned NOT NULL DEFAULT 1,
	customer_id bigint unsigned NOT NULL,
	customer_timezone varchar(64) NOT NULL DEFAULT '',
	customer_note text NOT NULL,
	consent_at datetime NULL,
	token_hash char(64) NOT NULL,
	ics_sequence int unsigned NOT NULL DEFAULT 0,
	mutation_version int unsigned NOT NULL DEFAULT 0,
	created_at datetime NOT NULL,
	updated_at datetime NOT NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY token_hash (token_hash),
	KEY staff_day (staff_id,local_date,status),
	KEY status_start (status,start_datetime_utc),
	KEY service_start (service_id,start_datetime_utc),
	KEY start_utc (start_datetime_utc),
	KEY customer_idx (customer_id)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_orders (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	code varchar(12) NOT NULL,
	total_minor int unsigned NOT NULL DEFAULT 0,
	currency char(3) NOT NULL,
	payment_status varchar(20) NOT NULL DEFAULT 'none',
	gateway varchar(32) NOT NULL DEFAULT '',
	transaction_ref varchar(191) NOT NULL DEFAULT '',
	created_at datetime NOT NULL,
	updated_at datetime NOT NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY code (code)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_order_items (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	order_id bigint unsigned NOT NULL,
	item_type varchar(20) NOT NULL DEFAULT 'booking',
	booking_id bigint unsigned NULL,
	amount_minor int unsigned NOT NULL DEFAULT 0,
	meta varchar(191) NOT NULL DEFAULT '',
	PRIMARY KEY  (id),
	KEY order_idx (order_id),
	KEY booking_idx (booking_id)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_notifications (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	template_key varchar(64) NOT NULL,
	recipient varchar(20) NOT NULL,
	trigger_event varchar(64) NOT NULL,
	subject varchar(255) NOT NULL,
	body longtext NOT NULL,
	enabled tinyint(1) NOT NULL DEFAULT 1,
	PRIMARY KEY  (id),
	UNIQUE KEY template_key (template_key)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_activities (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	entity_type varchar(32) NOT NULL,
	entity_id bigint unsigned NOT NULL,
	action varchar(64) NOT NULL,
	meta longtext NOT NULL,
	initiated_by varchar(32) NOT NULL,
	created_at datetime NOT NULL,
	PRIMARY KEY  (id),
	KEY entity_idx (entity_type,entity_id,created_at),
	KEY created_idx (created_at)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_idempotency (
	key_hash char(64) NOT NULL,
	scope varchar(32) NOT NULL,
	request_hash char(64) NOT NULL,
	booking_id bigint unsigned NULL,
	response_code smallint unsigned NULL,
	expires_at datetime NOT NULL,
	PRIMARY KEY  (key_hash,scope),
	KEY expires_idx (expires_at)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_notification_deliveries (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	dispatch_key varchar(191) NOT NULL,
	template_key varchar(64) NOT NULL,
	booking_id bigint unsigned NULL,
	recipient_hash char(64) NOT NULL,
	payload_cipher longtext NOT NULL,
	status varchar(20) NOT NULL DEFAULT 'queued',
	attempts smallint unsigned NOT NULL DEFAULT 0,
	last_error_code varchar(64) NOT NULL DEFAULT '',
	created_at datetime NOT NULL,
	updated_at datetime NOT NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY dispatch_key (dispatch_key),
	KEY booking_status (booking_id,status),
	KEY recipient_day (recipient_hash,created_at),
	KEY status_updated (status,updated_at)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_rate_counters (
	counter_key char(64) NOT NULL,
	window_start datetime NOT NULL,
	hits int unsigned NOT NULL DEFAULT 1,
	PRIMARY KEY  (counter_key)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_staff_meta (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	staff_id bigint unsigned NOT NULL,
	meta_key varchar(191) NOT NULL,
	meta_value longtext NOT NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY owner_key (staff_id,meta_key)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_service_meta (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	service_id bigint unsigned NOT NULL,
	meta_key varchar(191) NOT NULL,
	meta_value longtext NOT NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY owner_key (service_id,meta_key)
) ENGINE=InnoDB {$cc};";

		$statements[] = "CREATE TABLE {$p}aponto_booking_meta (
	id bigint unsigned NOT NULL AUTO_INCREMENT,
	booking_id bigint unsigned NOT NULL,
	meta_key varchar(191) NOT NULL,
	meta_value longtext NOT NULL,
	PRIMARY KEY  (id),
	UNIQUE KEY owner_key (booking_id,meta_key)
) ENGINE=InnoDB {$cc};";

		return $statements;
	}
}
