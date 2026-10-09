<?php
/**
 * Resumable strict CSV parsing with bounded, JSON-safe state.
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Import;

use InvalidArgumentException;

// phpcs:disable WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Authored validation messages returned as JSON text, never rendered as HTML.
// phpcs:disable WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode, WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- Encode partial UTF-8 bytes for JSON-safe state, never executable content.
// phpcs:disable Universal.NamingConventions.NoReservedKeywordParameterNames.finalFound -- Public contract uses final for EOF marker.
/** Emits one record at a time and never retains completed data records. */
final class StreamingCsvParser {
	public const MAX_ROWS         = 100000;
	public const MAX_COLUMNS      = 64;
	public const MAX_CELL_BYTES   = 16000;
	public const MAX_RECORD_BYTES = 65536;
	private const VERSION         = 1;
	private const BOM             = "\xEF\xBB\xBF";

	/**
	 * Consume a bounded number of records from the supplied file segment.
	 *
	 * Pass an empty state for a new file. Return `consumed` is the byte count consumed from THIS
	 * chunk; pass its unconsumed suffix again with the returned state. `bytes` counts all consumed
	 * file bytes, including BOM and record terminators. `records` includes the header, `rows` does
	 * not. `line` is the current physical source line. `record_line` is the current record's first
	 * source line; `record_bytes` excludes an unquoted line terminator. Partial UTF-8 cell/BOM bytes
	 * are base64 encoded, so state survives JSON round trips even across a multibyte character.
	 *
	 * `final` means this input segment reaches EOF, not that its full contents must be consumed.
	 * `finished` is true only after the parser consumed and validated EOF. Callback receives the
	 * validated header as its FIRST record, then data records. The header counts toward maxRecords.
	 * Callers must atomically persist emitted records together with state/offset, or discard both
	 * when an exception occurs. State contains personal data and must use protected storage.
	 *
	 * @param string              $chunk Raw bytes at the caller's current offset.
	 * @param array<string,mixed> $state State previously returned, or empty for a new file.
	 * @param bool                $final Whether this input ends at file EOF.
	 * @param callable            $emit Receives array{line:int,cells:list<string>}.
	 * @param string              $delimiter Comma, semicolon or tab, unchanged throughout the stream.
	 * @param int                 $max_records Maximum callback emissions in this invocation (positive).
	 * @return array<string,mixed> Bounded state, including consumed and finished.
	 * @throws InvalidArgumentException On invalid CSV, limit violation or incompatible state.
	 */
	public function feed( string $chunk, array $state, bool $final, callable $emit, string $delimiter = ',', int $max_records = 250 ): array {
		if ( ! in_array( $delimiter, array( ',', ';', "\t" ), true ) || $max_records < 1 ) {
			throw new InvalidArgumentException( __( 'Choose a supported delimiter and a positive record budget.', 'aponto' ) );
		}
		if ( array() === $state ) {
			$state = array(
				'version'      => self::VERSION,
				'delimiter'    => $delimiter,
				'bytes'        => 0,
				'consumed'     => 0,
				'line'         => 1,
				'record_line'  => 1,
				'records'      => 0,
				'rows'         => 0,
				'mode'         => 'start',
				'cell_b64'     => '',
				'cells'        => array(),
				'headers'      => null,
				'record_bytes' => 0,
				'pending_cr'   => '',
				'bom_done'     => false,
				'bom_b64'      => '',
				'finished'     => false,
			);
		} elseif ( ( $state['version'] ?? null ) !== self::VERSION || ( $state['delimiter'] ?? null ) !== $delimiter || ( $state['finished'] ?? false ) ) {
			throw new InvalidArgumentException( __( 'CSV parser state is incompatible or already finished.', 'aponto' ) );
		}
		$state['consumed'] = 0;
		$cell              = base64_decode( $state['cell_b64'], true );
		$prefix            = base64_decode( $state['bom_b64'], true );
		if ( false === $cell || false === $prefix ) {
			throw new InvalidArgumentException( __( 'CSV parser state is invalid.', 'aponto' ) );
		}
		$length = strlen( $chunk );
		$cursor = 0;
		$replay = '';
		if ( ! $state['bom_done'] ) {
			$prefix_length = strlen( $prefix );
			while ( $cursor < $length && $prefix_length < 3 && str_starts_with( self::BOM, $prefix ) ) {
				$prefix .= $chunk[ $cursor++ ];
				++$prefix_length;
				++$state['bytes'];
			}
			if ( strlen( $prefix ) < 3 && str_starts_with( self::BOM, $prefix ) && ! $final ) {
				$state['bom_b64']  = base64_encode( $prefix );
				$state['consumed'] = $cursor;
				return $state;
			}
			$state['bom_done'] = true;
			$state['bom_b64']  = '';
			$replay            = self::BOM === $prefix ? '' : $prefix;
		}
		// Prefix bytes were already counted when read; replay them only as syntax, never as input.
		$replay_length = strlen( $replay );
		$replay_cursor = 0;
		$emitted       = 0;
		while ( $replay_cursor < $replay_length || $cursor < $length ) {
			if ( $replay_cursor < $replay_length ) {
				$char = $replay[ $replay_cursor++ ];
			} else {
				$char = $chunk[ $cursor++ ];
				++$state['bytes'];
			}
			if ( $this->consume( $char, $state, $cell, $emit ) && ++$emitted >= $max_records ) {
				break;
			}
		}
		if ( $final && $cursor === $length && $replay_cursor === $replay_length ) {
			if ( 'quoted' === $state['mode'] ) {
				throw new InvalidArgumentException( __( 'CSV contains an unclosed quoted cell.', 'aponto' ) );
			}
			if ( array() !== $state['cells'] || '' !== $cell || 'start' !== $state['mode'] ) {
				$this->finishCell( $state, $cell );
				$this->finishRecord( $state, $emit );
			}
			if ( 0 === $state['records'] ) {
				throw new InvalidArgumentException( __( 'CSV requires a header.', 'aponto' ) );
			}
			$state['finished'] = true;
		}
		$state['cell_b64'] = base64_encode( $cell );
		$state['consumed'] = $cursor;
		return $state;
	}

	/**
	 * Process one byte; return whether it completed an emitted record.
	 *
	 * @param string              $char One raw byte.
	 * @param array<string,mixed> $state Mutable parser state.
	 * @param string              $cell Current decoded cell bytes.
	 * @param callable            $emit Record consumer.
	 * @throws InvalidArgumentException On malformed data or bounds violations.
	 */
	private function consume( string $char, array &$state, string &$cell, callable $emit ): bool {
		if ( "\0" === $char ) {
			throw new InvalidArgumentException( __( 'CSV must not contain null bytes.', 'aponto' ) );
		}
		if ( '' !== $state['pending_cr'] ) {
			$quoted_cr           = 'quoted' === $state['pending_cr'];
			$state['pending_cr'] = '';
			if ( "\n" === $char ) {
				if ( $quoted_cr ) {
					$this->recordByte( $state );
					$cell .= $char;
					$this->checkCell( $cell );
				}
				return false;
			}
		}
		$newline = "\r" === $char || "\n" === $char;
		if ( 'quoted' === $state['mode'] ) {
			$this->recordByte( $state );
			if ( '"' === $char ) {
				$state['mode'] = 'closed';
			} else {
				$cell .= $char;
				if ( $newline ) {
					++$state['line'];
					$state['pending_cr'] = "\r" === $char ? 'quoted' : '';
				}
			}
		} elseif ( $state['delimiter'] === $char || $newline ) {
			if ( ! $newline ) {
				$this->recordByte( $state );
			}
			$this->finishCell( $state, $cell );
			if ( $newline ) {
				$this->finishRecord( $state, $emit );
				$state['record_line'] = ++$state['line'];
				$state['pending_cr']  = "\r" === $char ? 'record' : '';
				return true;
			}
		} elseif ( '"' === $char && 'start' === $state['mode'] ) {
			$this->recordByte( $state );
			$state['mode'] = 'quoted';
		} elseif ( '"' === $char && 'closed' === $state['mode'] ) {
			$this->recordByte( $state );
			$cell         .= '"';
			$state['mode'] = 'quoted';
		} elseif ( 'closed' === $state['mode'] || '"' === $char ) {
			throw new InvalidArgumentException( __( 'CSV contains malformed quoting.', 'aponto' ) );
		} else {
			$this->recordByte( $state );
			$cell         .= $char;
			$state['mode'] = 'plain';
		}
		$this->checkCell( $cell );
		return false;
	}

	/**
	 * Count raw record content (quoted syntax included, unquoted line ending excluded).
	 *
	 * @param array<string,mixed> $state State.
	 * @throws InvalidArgumentException On an oversized record.
	 */
	private function recordByte( array &$state ): void {
		if ( ++$state['record_bytes'] > self::MAX_RECORD_BYTES ) {
			throw new InvalidArgumentException( __( 'CSV contains a record larger than 64 KiB.', 'aponto' ) );
		}
	}

	/**
	 * Bound the current decoded cell, including partial UTF-8 sequences.
	 *
	 * @param string $cell Cell.
	 * @throws InvalidArgumentException On an oversized cell.
	 */
	private function checkCell( string $cell ): void {
		if ( strlen( $cell ) > self::MAX_CELL_BYTES ) {
			throw new InvalidArgumentException( __( 'CSV contains a cell larger than 16000 bytes.', 'aponto' ) );
		}
	}

	/**
	 * Validate only complete UTF-8 cells, never a partial multibyte sequence at a chunk boundary.
	 *
	 * @param array<string,mixed> $state State.
	 * @param string              $cell Cell.
	 * @throws InvalidArgumentException On invalid text or too many columns.
	 */
	private function finishCell( array &$state, string &$cell ): void {
		if ( 1 !== preg_match( '//u', $cell ) ) {
			throw new InvalidArgumentException( __( 'CSV must contain valid UTF-8 text.', 'aponto' ) );
		}
		$state['cells'][] = $cell;
		$cell             = '';
		$state['mode']    = 'start';
		if ( count( $state['cells'] ) > self::MAX_COLUMNS ) {
			throw new InvalidArgumentException( __( 'CSV has too many columns.', 'aponto' ) );
		}
	}

	/**
	 * Validate shape before emitting, then discard every completed data record from state.
	 *
	 * @param array<string,mixed> $state State.
	 * @param callable            $emit Consumer.
	 * @throws InvalidArgumentException On header errors, row shape or count violations.
	 */
	private function finishRecord( array &$state, callable $emit ): void {
		$cells = $state['cells'];
		if ( null === $state['headers'] ) {
			if ( count( array_unique( array_map( 'strtolower', $cells ) ) ) !== count( $cells ) ) {
				throw new InvalidArgumentException( __( 'CSV headers must be unique.', 'aponto' ) );
			}
			foreach ( $cells as $header ) {
				if ( '' === trim( $header ) || trim( $header ) !== $header || preg_match( '/[\x00-\x1f\x7f]/', $header ) ) {
					throw new InvalidArgumentException( __( 'CSV headers must be nonempty text without surrounding whitespace or control characters.', 'aponto' ) );
				}
			}
			$state['headers'] = $cells;
		} else {
			if ( count( $cells ) !== count( $state['headers'] ) ) {
				throw new InvalidArgumentException( __( 'Every CSV row must have the same number of cells as the header.', 'aponto' ) );
			}
			if ( ++$state['rows'] > self::MAX_ROWS ) {
				throw new InvalidArgumentException( __( 'CSV exceeds the 100000 data row limit.', 'aponto' ) );
			}
		}
		++$state['records'];
		$emit(
			array(
				'line'  => $state['record_line'],
				'cells' => $cells,
			)
		);
		$state['cells']        = array();
		$state['record_bytes'] = 0;
	}
}
