<?php
/**
 * Media Library import before catalog transactions.
 *
 * @package Aponto
 */

declare(strict_types=1);
namespace Aponto\Import;

/** A URL is never assigned directly to a domain image field. */
class ImportMedia {
	/**
	 * Validate an image source without creating media.
	 *
	 * @param string $url Image source.
	 * @return string|null Validation message.
	 */
	public static function validate( string $url ): ?string {
		if ( ! current_user_can( 'upload_files' ) ) {
			return __( 'You need permission to upload media.', 'aponto' );
		}
		if ( strlen( $url ) > 2048 || ! preg_match( '#^https?://#i', $url ) || ! wp_http_validate_url( $url ) ) {
			return __( 'Use a publicly accessible HTTP or HTTPS image URL.', 'aponto' );
		}
		return null;
	}
	/**
	 * Import or reuse a fully generated attachment.
	 *
	 * @param string $url Source.
	 * @return int|\WP_Error Attachment ID.
	 */
	public function import( string $url ): int|\WP_Error {
		$error = $this->validateSource( $url );
		if ( null !== $error ) {
			return \Aponto\Rest\Errors::validation( array( 'image' => $error ) );
		}
		$key = hash( 'sha256', $url );
		$id  = $this->existing( $key );
		if ( is_wp_error( $id ) || $id > 0 ) {
			return $id; }
		$temp = $this->download( $url );
		if ( is_wp_error( $temp ) ) {
			return $temp; }
		try {
			return $this->attach( $temp, $key );
		} finally {
			$this->cleanup( $temp );
		}
	}
	/**
	 * Permission and URL validation boundary.
	 *
	 * @param string $url Source.
	 * @return string|null Error.
	 */
	protected function validateSource( string $url ): ?string {
		return self::validate( $url ); }
	/**
	 * Verify a prior successful import; metadata must also exist.
	 *
	 * @param string $key URL hash.
	 */
	protected function existing( string $key ): int|\WP_Error {
		$ids = get_posts(
			array(
				'post_type'      => 'attachment',
				'post_status'    => 'inherit',
				'posts_per_page' => 1,
				'fields'         => 'ids',
				// phpcs:disable WordPress.DB.SlowDBQuery.slow_db_query_meta_key, WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- One attachment lookup per imported image, during an admin import run only.
				'meta_key'       => '_aponto_import_image',
				'meta_value'     => $key,
				// phpcs:enable WordPress.DB.SlowDBQuery.slow_db_query_meta_key, WordPress.DB.SlowDBQuery.slow_db_query_meta_value
			)
		);
		if ( $ids && wp_attachment_is_image( $ids[0] ) && is_file( (string) get_attached_file( $ids[0] ) ) ) {
			$id = (int) $ids[0];
			if ( ! wp_get_attachment_metadata( $id ) ) {
				require_once ABSPATH . 'wp-admin/includes/image.php';
				$metadata = wp_generate_attachment_metadata( $id, (string) get_attached_file( $id ) );
				if ( $metadata ) {
					wp_update_attachment_metadata( $id, $metadata ); }
			}
			return wp_get_attachment_metadata( $id ) ? $id : \Aponto\Rest\Errors::validation( array( 'image' => __( 'Image metadata could not be generated. Retry after checking the Media Library.', 'aponto' ) ) );
		}
		return 0;
	}
	/**
	 * Download bounded bytes through the SSRF-safe WordPress client.
	 *
	 * @param string $url Source.
	 * @return string|\WP_Error Temporary path.
	 */
	protected function download( string $url ): string|\WP_Error {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		$temp = wp_tempnam( 'aponto-image' );
		if ( ! $temp ) {
			return \Aponto\Rest\Errors::validation( array( 'image' => __( 'Could not create an image download file.', 'aponto' ) ) );
		}
		$response = wp_safe_remote_get(
			$url,
			array(
				'timeout'             => 20,
				'redirection'         => 3,
				'stream'              => true,
				'filename'            => $temp,
				'limit_response_size' => 10485761,
			)
		);
		if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) || filesize( $temp ) > 10485760 ) {
			$this->cleanup( $temp );
			return \Aponto\Rest\Errors::validation( array( 'image' => __( 'Image download failed or exceeds 10 MiB.', 'aponto' ) ) );
		}
		return $temp;
	}
	/**
	 * Create the attachment and WordPress image metadata before returning an ID.
	 *
	 * @param string $temp Downloaded path.
	 * @param string $key URL hash.
	 * @return int|\WP_Error Attachment ID.
	 */
	protected function attach( string $temp, string $key ): int|\WP_Error {
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';
		$mime       = wp_get_image_mime( $temp );
		$extensions = array(
			'image/jpeg' => 'jpg',
			'image/png'  => 'png',
			'image/gif'  => 'gif',
			'image/webp' => 'webp',
			'image/avif' => 'avif',
		);
		$size       = wp_getimagesize( $temp );
		if ( ! isset( $extensions[ $mime ] ) || ! $size || $size[0] * $size[1] > 40000000 ) {
			return \Aponto\Rest\Errors::validation( array( 'image' => __( 'Use a supported raster image up to 40 megapixels.', 'aponto' ) ) );
		}
		$id = media_handle_sideload(
			array(
				'name'     => 'import-' . substr( $key, 0, 16 ) . '.' . $extensions[ $mime ],
				'tmp_name' => $temp,
			),
			0,
			null,
			array( 'meta_input' => array( '_aponto_import_image' => $key ) )
		);
		if ( is_wp_error( $id ) || ! wp_get_attachment_metadata( $id ) ) {
			return \Aponto\Rest\Errors::validation( array( 'image' => __( 'WordPress could not finish importing this image into the Media Library.', 'aponto' ) ) );
		}
		return (int) $id;
	}
	/**
	 * Remove a temporary download only, never an attachment.
	 *
	 * @param string $temp Temporary path.
	 */
	protected function cleanup( string $temp ): void {
		if ( is_file( $temp ) ) {
			wp_delete_file( $temp ); }
	}
}
