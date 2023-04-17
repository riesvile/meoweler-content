const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const city_schema = new Schema({
	name: {
		type: String,
		index: true,
		required: true
	},
	name_ascii: {
		type: String,
		index: true
	},
	id: {
		type: String,
		index: true,
		required: true
	},
	country: String,
	tagline: String,
	summary_p1: String,
	summary_p2: String,
	months: Object,
	tipping_range: String,
	tipping_comment: String,
	net_speed: Array,
	net_availability: Array,
	net_coverage: Array,
	bike_rating: Array,
	walk_rating: Array,
	lgbtq_rating: Array,
	ttd_names: Array,
	ttd_descriptions: Array,
	ttd_emojis: Array,
	gems_names: Array,
	gems_descriptions: Array,
	gems_emojis: Array,
	visit_duration: String,
	duration_reason_short: String,
	duration_reason_long: String,
	mindful_meoweler: Object,
	songs: Object,
	websites: Object,
	meowscore_object: Object,
	meowscore: Number,
	population: Number
}, {timestamps: true});

const City = mongoose.model('City', city_schema);
module.exports = City;