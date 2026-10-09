<?php
/**
 * Domain exception: the picked customer record was erased.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Booking\Exception;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

use Aponto\Support\DomainException;

/**
 * The customer an operator picked for a booking (`customer_id`, D-R77) is an ANONYMIZED record —
 * erased by a privacy request or the retention sweep (`aponto_validation`, 422, field
 * `customer_id`). Not retryable: the person behind the row asked to be forgotten, and a new
 * booking would attach fresh activity to "Deleted customer" (Codex review 2026-10-06).
 *
 * Thrown by {@see \Aponto\Booking\Repository\CustomerRepository::resolve()} INSIDE the reservation
 * transaction, so an erasure that commits between the controller's pre-read and the write is
 * refused too; the transaction rolls back and nothing is written.
 */
final class CustomerErased extends DomainException {

	/**
	 * Construct the exception.
	 */
	public function __construct() {
		parent::__construct( 'The picked customer record was erased.' );
	}

	/**
	 * Stable REST error code.
	 */
	public function errorCode(): string {
		return 'aponto_validation';
	}

	/**
	 * HTTP status.
	 */
	public function httpStatus(): int {
		return 422;
	}
}
