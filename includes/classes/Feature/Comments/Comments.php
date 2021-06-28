<?php
/**
 * Comments feature
 *
 * @since   3.6.0
 * @package elasticpress
 */

namespace ElasticPress\Feature\Comments;

use ElasticPress\Feature as Feature;
use ElasticPress\Indexables as Indexables;
use ElasticPress\Indexable as Indexable;
use ElasticPress\FeatureRequirementsStatus as FeatureRequirementsStatus;

/**
 * Comments feature class
 */
class Comments extends Feature {

	/**
	 * Initialize feature, setting it's config
	 *
	 * @since 3.6.0
	 */
	public function __construct() {
		$this->slug                     = 'comments';
		$this->title                    = esc_html__( 'Comments', 'elasticpress' );
		$this->requires_install_reindex = true;

		parent::__construct();
	}

	/**
	 * Setup search functionality
	 *
	 * @since 3.6.0
	 */
	public function setup() {
		Indexables::factory()->register( new Indexable\Comment\Comment() );

		add_action( 'init', [ $this, 'search_setup' ] );
		add_action( 'widgets_init', [ $this, 'register_widget' ] );
		add_action( 'rest_api_init', [ $this, 'rest_api_init' ] );
	}

	/**
	 * Setup search integration
	 *
	 * @since 3.6.0
	 */
	public function search_setup() {
		$admin_integration = apply_filters( 'ep_admin_wp_query_integration', false );

		if ( defined( 'DOING_AJAX' ) && DOING_AJAX ) {
			/**
			 * Filter to integrate with admin ajax queries
			 *
			 * @hook ep_ajax_wp_query_integration
			 * @param  {bool} $integrate True to integrate
			 * @return  {bool} New value
			 */
			if ( ! apply_filters( 'ep_ajax_wp_query_integration', false ) ) {
				return;
			} else {
				$admin_integration = true;
			}
		}

		if ( is_admin() && ! $admin_integration ) {
			return;
		}

		add_filter( 'ep_elasticpress_enabled', [ $this, 'integrate_search_queries' ], 10, 2 );
	}

	/**
	 * Output feature box summary
	 *
	 * @since 3.6.0
	 */
	public function output_feature_box_summary() {
		?>
		<p><?php esc_html_e( 'Improve comment search relevancy and query performance.', 'elasticpress' ); ?></p>
		<?php
	}

	/**
	 * Output feature box long text
	 *
	 * @since 3.6.0
	 */
	public function output_feature_box_long() {
		?>
		<p><?php esc_html_e( 'This feature will empower your website to overcome traditional WordPress comment search and query limitations that can present themselves at scale.', 'elasticpress' ); ?></p>
		<?php
	}

	/**
	 * Enable integration on search queries
	 *
	 * @param  bool              $enabled Whether EP is enabled
	 * @param  \WP_Comment_Query $query Current query object.
	 * @since  3.6.0
	 * @return bool
	 */
	public function integrate_search_queries( $enabled, $query ) {
		if ( ! is_a( $query, 'WP_Comment_Query' ) ) {
			return $enabled;
		}

		if ( isset( $query->query_vars['ep_integrate'] ) && false === $query->query_vars['ep_integrate'] ) {
			$enabled = false;
		} elseif ( ! empty( $query->query_vars['search'] ) ) {
			$enabled = true;
		}

		return $enabled;
	}

	/**
	 * Determine feature reqs status
	 *
	 * @since  3.6.0
	 * @return FeatureRequirementsStatus
	 */
	public function requirements_status() {
		$status = new FeatureRequirementsStatus( 1 );

		return $status;
	}

	/**
	 * Register comments widget
	 *
	 * @since  3.6
	 */
	public function register_widget() {
		register_widget( __NAMESPACE__ . '\Widget' );
	}

	/**
	 * Registers the API endpoint to search for comments
	 */
	public function rest_api_init() {
		register_rest_route(
			'elasticpress/v1',
			'comments',
			[
				'methods'             => 'GET',
				'callback'            => [ $this, 'handle_comments_search' ],
				'permission_callback' => '__return_true',
				'args'                => [
					's' => [
						'validate_callback' => function ( $param ) {
							return ! empty( $param );
						},
						'required'          => true,
					],
				],
			]
		);
	}

	/**
	 * Handles the search for comments
	 *
	 * @param \WP_REST_Request $request Rest request
	 *
	 * @return array
	 */
	public function handle_comments_search( $request ) {
		$search = $request->get_param( 's' );

		if ( empty( $search ) ) {
			return new \WP_Error( 400 );
		}

		$default_args = [
			'status'      => 'approve',
			'search'      => $search,
			'post_type'   => Indexables::factory()->get( 'post' )->get_indexable_post_types(),
			'post_status' => 'publish',
			'number'      => 5,
		];

		/**
		 * Filter to args used in WP_Comment_Query in Widget Search Comment
		 *
		 * @hook ep_widget_search_comments_args
		 * @since 3.6.0
		 * @param  {array} $default_args Defaults args
		 * @return {array} New value
		 */
		$args = apply_filters( 'ep_widget_search_comments_args', $default_args );

		$comment_query = new \WP_Comment_Query( $args );

		$return = [];
		foreach ( $comment_query->comments as $comment ) {
			$return[ $comment->comment_ID ] = [
				'id'      => $comment->comment_ID,
				'content' => $comment->comment_content,
				'link'    => get_comment_link( $comment ),
			];
		}

		return $return;
	}
}
