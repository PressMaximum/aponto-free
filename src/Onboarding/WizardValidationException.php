<?php
/**
 * Onboarding wizard validation refusal.
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Onboarding;

if ( ! defined( 'ABSPATH' ) ) {
	if ( ! defined( 'APONTO_TESTING' ) ) {
		exit;
	}
}

/**
 * A wizard step was REFUSED because the values it carried are not usable (SPEC-P1 §4).
 *
 * The wizard's steps used to answer bad input by quietly dropping it — an inverted business-hours
 * range vanished into a "Closed" day and a mistyped staff email was sanitized away to '' (beta
 * reports 2026-08-01, QA A + QA B). Both are silent data loss on the founder's own setup data, so
 * the service layer now throws this instead: {@see WizardPage::handleAjax()} turns it into the
 * step's error payload (`data.message` for the notice, `data.fields` for the inline field errors)
 * and NOTHING is written.
 *
 * Distinct from the plain `\RuntimeException`s the service throws for infrastructure failures
 * (a lost lock, a failed insert): those are retryable and generic, this one is actionable and names
 * the offending fields.
 */
final class WizardValidationException extends \RuntimeException {

	/**
	 * Construct the refusal.
	 *
	 * @param string                $message Human-readable summary for the step's error notice.
	 * @param array<string, string> $fields  Field key => message (weekday number for the hours grid,
	 *                                       the field name elsewhere). May be empty.
	 */
	public function __construct(
		string $message,
		private array $fields = array()
	) {
		parent::__construct( $message );
	}

	/**
	 * Per-field messages for the client's inline errors.
	 *
	 * @return array<string, string>
	 */
	public function fields(): array {
		return $this->fields;
	}
}
