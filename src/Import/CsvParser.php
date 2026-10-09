<?php
/**
 * Bounded, strict CSV reader (docs/import-css/PLAN.md).
 *
 * @package Aponto
 */

declare(strict_types=1);

namespace Aponto\Import;

use InvalidArgumentException;

/** Reads CSV without permissive recovery of malformed quoting. */
final class CsvParser {
	/** Maximum uploaded bytes. */
	public const MAX_BYTES = 1048576;
	/** Maximum data records. */
	public const MAX_ROWS = 1000;
	/** Maximum columns. */
	public const MAX_COLUMNS = 64;
	/** Maximum bytes in a decoded cell. */
	public const MAX_CELL_BYTES = 16000;

	/**
	 * Parse UTF-8 CSV, preserving source record line numbers.
	 *
	 * @param string $csv CSV bytes.
	 * @param string $delimiter Explicit delimiter.
	 * @return array{headers:list<string>,rows:list<array{line:int,cells:list<string>}>}
	 * @throws InvalidArgumentException On invalid or oversized input; messages contain no data.
	 */
	public function parse( string $csv, string $delimiter = ',' ): array {
		if ( ! in_array( $delimiter, array( ',', ';', "\t" ), true ) ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Authored message sent as JSON; the UI renders it as text.
			throw new InvalidArgumentException( __( 'Choose comma, semicolon or tab as the delimiter.', 'aponto' ) );
		}
		if ( strlen( $csv ) > self::MAX_BYTES || 1 !== preg_match( '//u', $csv ) || str_contains( $csv, "\0" ) ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Authored message sent as JSON; the UI renders it as text.
			throw new InvalidArgumentException( __( 'CSV must be UTF-8, contain no null bytes and be at most 1 MiB.', 'aponto' ) );
		}
		if ( str_starts_with( $csv, "\xEF\xBB\xBF" ) ) {
			$csv = substr( $csv, 3 );
		}
		$records     = array();
		$cells       = array();
		$cell        = '';
		$state       = 'start';
		$line        = 1;
		$record_line = 1;
		$length      = strlen( $csv );
		for ( $i = 0; $i < $length; ++$i ) {
			$char    = $csv[ $i ];
			$newline = "\r" === $char || "\n" === $char;
			if ( 'quoted' === $state ) {
				if ( '"' === $char ) {
					$state = 'closed';
				} else {
					$cell .= $char;
					if ( $newline ) {
						if ( "\r" === $char && $i + 1 < $length && "\n" === $csv[ $i + 1 ] ) {
							$cell .= $csv[ ++$i ];
						}
						++$line;
					}
				}
			} elseif ( $delimiter === $char || $newline ) {
				$cells[] = $cell;
				$cell    = '';
				$state   = 'start';
				if ( count( $cells ) > self::MAX_COLUMNS ) {
					// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Authored message sent as JSON; the UI renders it as text.
					throw new InvalidArgumentException( __( 'CSV has too many columns.', 'aponto' ) );
				}
				if ( $newline ) {
					$records[] = array(
						'line'  => $record_line,
						'cells' => $cells,
					);
					$cells     = array();
					if ( "\r" === $char && $i + 1 < $length && "\n" === $csv[ $i + 1 ] ) {
						++$i;
					}
					$record_line = ++$line;
				}
			} elseif ( '"' === $char && 'start' === $state ) {
				$state = 'quoted';
			} elseif ( '"' === $char && 'closed' === $state ) {
				$cell .= '"';
				$state = 'quoted';
			} elseif ( 'closed' === $state || '"' === $char ) {
				// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Authored message sent as JSON; the UI renders it as text.
				throw new InvalidArgumentException( __( 'CSV contains malformed quoting.', 'aponto' ) );
			} else {
				$cell .= $char;
				$state = 'plain';
			}
			if ( strlen( $cell ) > self::MAX_CELL_BYTES || count( $records ) > self::MAX_ROWS + 1 ) {
				// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Authored message sent as JSON; the UI renders it as text.
				throw new InvalidArgumentException( __( 'CSV exceeds the row or cell size limit.', 'aponto' ) );
			}
		}
		if ( 'quoted' === $state ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Authored message sent as JSON; the UI renders it as text.
			throw new InvalidArgumentException( __( 'CSV contains an unclosed quoted cell.', 'aponto' ) );
		}
		if ( $record_line <= $line && ( array() !== $cells || '' !== $cell || 'start' !== $state ) ) {
			$cells[]   = $cell;
			$records[] = array(
				'line'  => $record_line,
				'cells' => $cells,
			);
		}
		if ( array() === $records || count( $records ) > self::MAX_ROWS + 1 ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Authored message sent as JSON; the UI renders it as text.
			throw new InvalidArgumentException( __( 'CSV requires a header and at most 1000 data rows.', 'aponto' ) );
		}
		$headers = array_shift( $records )['cells'];
		if ( count( $headers ) > self::MAX_COLUMNS || count( array_unique( array_map( 'strtolower', $headers ) ) ) !== count( $headers ) ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Authored message sent as JSON; the UI renders it as text.
			throw new InvalidArgumentException( __( 'CSV headers must be unique with at most 64 columns.', 'aponto' ) );
		}
		foreach ( $headers as $header ) {
			if ( '' === trim( $header ) || trim( $header ) !== $header || preg_match( '/[\x00-\x1f\x7f]/', $header ) ) {
				// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Authored message sent as JSON; the UI renders it as text.
				throw new InvalidArgumentException( __( 'CSV headers must be nonempty text without surrounding whitespace or control characters.', 'aponto' ) );
			}
		}
		foreach ( $records as $record ) {
			if ( count( $record['cells'] ) !== count( $headers ) ) {
				// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Authored message sent as JSON; the UI renders it as text.
				throw new InvalidArgumentException( __( 'Every CSV row must have the same number of cells as the header.', 'aponto' ) );
			}
		}
		return array(
			'headers' => $headers,
			'rows'    => $records,
		);
	}
}
