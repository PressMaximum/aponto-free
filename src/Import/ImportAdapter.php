<?php
/**
 * Entity boundary for CSV import.
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Import;

/** Domain validation/writes; the application owns batch progress. */
interface ImportAdapter {
	/**
	 * Propose a create or reuse without mutation.
	 *
	 * @param string               $source Source namespace.
	 * @param array<string,string> $values Mapped values.
	 * @return array<string,mixed> Preview outcome.
	 */
	public function preview( string $source, array $values ): array;
	/**
	 * Persist validated data using the domain write model.
	 *
	 * @param string               $source Source namespace.
	 * @param array<string,string> $values Mapped values.
	 * @param int|null             $expected_target Preview-approved target.
	 * @return array<string,mixed> Persisted outcome, with optional deferred effects.
	 */
	public function write( string $source, array $values, ?int $expected_target = null ): array;
	/**
	 * Declare locks to acquire before starting the row transaction.
	 *
	 * @param string               $source Source namespace.
	 * @param array<string,string> $values Mapped values.
	 * @return list<\Aponto\Database\Lock> Domain locks in global acquisition order.
	 */
	public function locks( string $source, array $values ): array;
}
