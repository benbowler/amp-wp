/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import edit from './edit';
import blockIcon from '../../../../images/call-to-action.svg';

const schema = {
	postId: {
		type: 'number',
	},
	title: {
		type: 'string',
		source: 'html',
		selector: 'a',
	},
	text: {
		type: 'string',
		source: 'html',
		selector: 'a',
	},
	theme: {
		type: 'string',
		default: 'light',
	},
};

export const name = 'amp/amp-story-page-attachment';

export const settings = {
	title: __( 'Page attachment', 'amp' ),

	description: __( 'Attach additional content to a story page.', 'amp' ),

	icon: blockIcon,

	category: 'layout',

	keywords: [
		__( 'attachment', 'amp' ),
		__( 'content', 'amp' ),
		__( 'embed', 'amp' ),
	],

	attributes: schema,

	edit,

	save() {
		// Dynamic content, handled by PHP.
		return null;
	},
};
