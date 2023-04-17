const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const country_schema = new Schema({
	name: {
		type: String,
		index: true,
		required: true
	},
	currency_code: String,
	language: String,
	socket_type: String,
	cities: Array
}, {timestamps: true});

const Country = mongoose.model('Country', country_schema);
module.exports = Country;