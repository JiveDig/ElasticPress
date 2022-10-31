/**
 * WordPress dependencies.
 */
import apiFetch from '@wordpress/api-fetch';
import { withNotices } from '@wordpress/components';
import { WPElement, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { isEqual } from 'lodash';

/**
 * Internal Dependencies.
 */
import Actions from './weighting/actions';
import MetaMode from './weighting/meta-mode';
import PostType from './weighting/post-type';

/**
 * Weighting settings app.
 *
 * @param {object} props Component props.
 * @param {string} props.apiUrl API URL.
 * @param {'auto'|'manual'} props.metaMode Metadata management mode.
 * @param {object} props.noticeOperations Notice operations from withNotices.
 * @param {WPElement} props.noticeUI Notice UI from withNotices.
 * @param {object} props.weightableFields Weightable fields, indexed by post type.
 * @param {object} props.weightingConfiguration Weighting configuration, indexed by post type.
 * @returns {WPElement} Element.
 */
const Weighting = ({
	apiUrl,
	metaMode,
	noticeOperations,
	noticeUI,
	weightableFields,
	weightingConfiguration,
}) => {
	const [currentMetaMode, setCurrentMetaMode] = useState(metaMode);
	const [currentWeightingConfiguration, setCurrentWeightingConfiguration] = useState({
		...weightingConfiguration,
	});

	const [savedMetaMode, setSavedMetaMode] = useState(metaMode);
	const [savedWeightingConfiguration, setSavedWeightingConfiguration] = useState({
		...weightingConfiguration,
	});

	const [isBusy, setIsBusy] = useState(false);

	/**
	 * Is the current data different to the saved data.
	 */
	const isChanged = useMemo(
		() =>
			!(
				currentMetaMode === savedMetaMode &&
				isEqual(currentWeightingConfiguration, savedWeightingConfiguration)
			),
		[
			currentWeightingConfiguration,
			currentMetaMode,
			savedWeightingConfiguration,
			savedMetaMode,
		],
	);

	/**
	 * Whether to show weighting for metadata.
	 */
	const showMeta = useMemo(() => currentMetaMode === 'manual', [currentMetaMode]);

	/**
	 * Handle meta mode change.
	 *
	 * @param {boolean} checked Is manual checked?
	 */
	const onChangeMetaMode = (checked) => {
		const metaMode = checked ? 'manual' : 'auto';

		setCurrentMetaMode(metaMode);
	};

	/**
	 * Handle data change.
	 *
	 * @param {string} postType Updated post type.
	 * @param {Array} values Updated data.
	 * @returns {void}
	 */
	const onChangePostType = (postType, values) => {
		setCurrentWeightingConfiguration({
			...currentWeightingConfiguration,
			[postType]: values,
		});
	};

	/**
	 * Handle resetting all settings.
	 *
	 * @returns {void}
	 */
	const onReset = () => {
		setCurrentMetaMode(savedMetaMode);
		setCurrentWeightingConfiguration({ ...savedWeightingConfiguration });
	};

	/**
	 * Handle for submission.
	 *
	 * @param {Event} event Submit event.
	 * @returns {void}
	 */
	const onSubmit = async (event) => {
		event.preventDefault();

		try {
			setIsBusy(true);

			const response = await apiFetch({
				body: JSON.stringify({
					meta_mode: currentMetaMode,
					weighting_configuration: currentWeightingConfiguration,
				}),
				headers: {
					'Content-Type': 'application/json',
				},
				method: 'POST',
				url: apiUrl,
			});

			const { meta_mode, weighting_configuration } = response.data;

			setSavedWeightingConfiguration(weighting_configuration);
			setSavedMetaMode(meta_mode);

			noticeOperations.createNotice({
				content: __('Search fields & weighting saved.', 'elasticpress'),
				status: 'success',
			});
		} catch {
			noticeOperations.createNotice({
				content: __('Whoops! Something went wrong. Please try again.', 'elasticpress'),
				status: 'error',
			});
		} finally {
			document.body.scrollIntoView({ behavior: 'smooth' });

			setIsBusy(false);
		}
	};

	/**
	 * Render.
	 */
	return (
		<form className="ep-weighting-screen" onSubmit={onSubmit}>
			<h1 className="page-title">{__('Manage Search Fields & Weighting', 'elasticpress')}</h1>
			{noticeUI}
			<div className="page-description">
				<p>
					{__(
						'This dashboard enables you to select which fields ElasticPress should sync, whether to use those fields in searches, and how heavily to weight fields in the search algorithm. In general, increasing the Weight of a field will increase the relevancy score of a post that has matching text in that field.',
						'elasticpress',
					)}
				</p>
				<p>
					{__(
						'For example, adding more weight to the title attribute will cause search matches on the post title to appear more prominently.',
						'elasticpress',
					)}
				</p>
			</div>
			<MetaMode checked={showMeta} onChange={onChangeMetaMode} />
			{Object.entries(weightableFields).map(([postType, { groups, label }]) => {
				const originalValues = savedWeightingConfiguration[postType] || {};
				const values = currentWeightingConfiguration[postType] || {};

				return (
					<PostType
						groups={groups}
						key={postType}
						label={label}
						onChange={(values) => {
							onChangePostType(postType, values);
						}}
						originalValues={originalValues}
						showMeta={showMeta}
						values={values}
					/>
				);
			})}
			<Actions isBusy={isBusy} isChanged={isChanged} onReset={onReset} onSubmit={onSubmit} />
		</form>
	);
};

export default withNotices(Weighting);